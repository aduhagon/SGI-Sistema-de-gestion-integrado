"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarAprobacionSchema } from "@/lib/schemas/envio";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoEnvio =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function enviarAAprobacion(
  documentoId: string,
  _estadoPrevio: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = enviarAprobacionSchema.safeParse({
    versionId: formData.get("versionId"),
    aprobadorN1Id: formData.get("aprobadorN1Id"),
    aprobadorN2Id: formData.get("aprobadorN2Id") || undefined,
    plazoDias: formData.get("plazoDias") || undefined,
    motivoOverride: formData.get("motivoOverride") || undefined,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const { versionId, aprobadorN1Id, aprobadorN2Id, plazoDias, motivoOverride } = parsed.data;

  // Traer la versión y validar estado.
  const { data: version, error: errVer } = await supabase
    .from("versiones")
    .select("id, documento_id, estado, creado_por")
    .eq("id", versionId)
    .maybeSingle();

  if (errVer || !version) {
    return { ok: false, error: "No se encontró la versión o no tenés acceso." };
  }

  if (version.documento_id !== documentoId) {
    return { ok: false, error: "La versión no corresponde a este documento." };
  }

  if (!["borrador", "confeccionado"].includes(version.estado as string)) {
    return {
      ok: false,
      error:
        "Solo se puede enviar a aprobación una versión en estado borrador o confeccionado.",
    };
  }

  // Validación de segregación en la app (la DB es la autoridad final).
  if (version.creado_por) {
    if (aprobadorN1Id === version.creado_por) {
      return {
        ok: false,
        error: "El aprobador de nivel 1 no puede ser el elaborador del documento.",
        campo: "aprobadorN1Id",
      };
    }
    if (aprobadorN2Id === version.creado_por) {
      return {
        ok: false,
        error: "El aprobador de nivel 2 no puede ser el elaborador del documento.",
        campo: "aprobadorN2Id",
      };
    }
  }

  // ¿Ya existe una aprobación abierta para esta versión?
  const { data: existente } = await supabase
    .from("aprobaciones")
    .select("id, cerrada_en")
    .eq("version_id", versionId)
    .is("cerrada_en", null)
    .maybeSingle();

  if (existente) {
    return {
      ok: false,
      error: "Esta versión ya tiene un proceso de aprobación abierto.",
    };
  }

  // Regla de aprobación por tipo (sugerida, no bloqueante): si los aprobadores
  // elegidos no cumplen el nivel sugerido, se exige un motivo de override.
  const { data: sugRows } = await supabase.rpc("fn_sugerencia_aprobacion", {
    p_documento_id: documentoId,
  });
  const sug = (sugRows as Array<{
    nivel_n1: string | null; nivel_n2: string | null; requiere_n2: boolean;
  }> | null)?.[0] ?? null;

  // ¿El tipo documental requiere segundo nivel de aprobación?
  // Si no lo requiere, N2 se omite por completo (aprobador_n2_id = null).
  const requiereN2 = sug?.requiere_n2 ?? true;

  let desvio = false;
  if (sug) {
    const { data: elegRows } = await supabase.rpc("fn_usuarios_elegibles_con_nivel");
    const nivelDe = new Map<string, string | null>(
      ((elegRows ?? []) as Array<{ usuario_id: string; nivel_jerarquico: string | null }>)
        .map((r) => [r.usuario_id, r.nivel_jerarquico]),
    );
    const n1Cumple = !sug.nivel_n1 || nivelDe.get(aprobadorN1Id) === sug.nivel_n1;
    // El nivel de N2 solo se evalúa si el tipo efectivamente requiere N2 y hay un N2 elegido.
    const n2Cumple =
      !requiereN2 ||
      !sug.nivel_n2 ||
      (!!aprobadorN2Id && nivelDe.get(aprobadorN2Id) === sug.nivel_n2);
    desvio = !n1Cumple || !n2Cumple;
  }

  if (desvio && (!motivoOverride || motivoOverride.length < 5)) {
    return {
      ok: false,
      error: "Elegiste aprobadores que no cumplen el nivel sugerido para este tipo de documento. Indicá un motivo (mínimo 5 caracteres) para continuar.",
      campo: "motivoOverride",
    };
  }

  // Si el tipo requiere N2, debe haberse elegido un aprobador de nivel 2.
  if (requiereN2 && !aprobadorN2Id) {
    return {
      ok: false,
      error: "Este tipo de documento requiere un aprobador de nivel 2.",
      campo: "aprobadorN2Id",
    };
  }

  const comentarioInicial = desvio && motivoOverride
    ? `[Override de regla de aprobación] ${motivoOverride}`
    : null;

  const ahora = new Date();
  const plazo = plazoDias
    ? new Date(ahora.getTime() + plazoDias * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // 1. Crear la aprobación. El trigger de segregación valida N1/N2 vs elaborador.
  //    Si el tipo no requiere N2, aprobador_n2_id queda null (aprobación de un solo nivel).
  const { error: errAprob } = await supabase.from("aprobaciones").insert({
    version_id: versionId,
    aprobador_n1_id: aprobadorN1Id,
    aprobador_n2_id: requiereN2 ? aprobadorN2Id : null,
    plazo_objetivo_n1: plazo,
    plazo_objetivo_n2: requiereN2 ? plazo : null,
    iniciada_en: ahora.toISOString(),
    comentario_n1: comentarioInicial,
    creado_por: usuarioId,
  });

  if (errAprob) {
    const msg = errAprob.message.toLowerCase().includes("segregac")
      ? "La combinación de aprobadores viola la segregación de funciones (el aprobador no puede ser el elaborador, y N1 y N2 deben ser distintos)."
      : `No se pudo crear la aprobación: ${errAprob.message}`;
    return { ok: false, error: msg };
  }

  // 2. Pasar la versión a pendiente_aprobacion.
  const { error: errUpd } = await supabase
    .from("versiones")
    .update({
      estado: "pendiente_aprobacion",
      fecha_enviado_aprobacion: ahora.toISOString(),
    })
    .eq("id", versionId);

  if (errUpd) {
    return {
      ok: false,
      error: `Se creó la aprobación pero no se pudo actualizar el estado de la versión: ${errUpd.message}`,
    };
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  revalidatePath("/aprobaciones");
  revalidatePath("/dashboard");

  return { ok: true };
}
