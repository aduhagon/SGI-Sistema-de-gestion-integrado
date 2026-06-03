"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decisionAprobacionSchema } from "@/lib/schemas/aprobacion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoDecision =
  | { ok: true; decision: "aprobado" | "rechazado"; nivel: number }
  | { ok: false; error: string; campo?: string }
  | null;

export async function decidirAprobacion(
  _estadoPrevio: EstadoDecision,
  formData: FormData,
): Promise<EstadoDecision> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = decisionAprobacionSchema.safeParse({
    aprobacionId: formData.get("aprobacionId"),
    nivel: formData.get("nivel"),
    decision: formData.get("decision"),
    comentario: formData.get("comentario") ?? undefined,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const { aprobacionId, nivel, decision, comentario } = parsed.data;

  // 1. Traer la aprobación y validar que es el turno correcto del usuario.
  const { data: aprob, error: errAprob } = await supabase
    .from("aprobaciones")
    .select(
      `id, version_id, aprobador_n1_id, aprobador_n2_id,
       decision_n1, decision_n2, cerrada_en,
       versiones:versiones!aprobaciones_version_id_fkey (
         id, estado, hash_archivo_principal
       )`,
    )
    .eq("id", aprobacionId)
    .maybeSingle();

  if (errAprob || !aprob) {
    return { ok: false, error: "No se encontró la aprobación o no tenés acceso." };
  }

  if (aprob.cerrada_en) {
    return { ok: false, error: "Esta aprobación ya está cerrada." };
  }

  const version = (aprob as any).versiones as
    | { id: string; estado: string; hash_archivo_principal: string | null }
    | null;

  // Validaciones de turno (la DB también las protege; esto da mejor mensaje).
  if (nivel === 1) {
    if (aprob.aprobador_n1_id !== usuarioId) {
      return { ok: false, error: "No sos el aprobador de nivel 1 de este documento." };
    }
    if (aprob.decision_n1 !== "pendiente") {
      return { ok: false, error: "El nivel 1 ya fue decidido." };
    }
  } else {
    if (aprob.aprobador_n2_id !== usuarioId) {
      return { ok: false, error: "No sos el aprobador de nivel 2 de este documento." };
    }
    if (aprob.decision_n1 !== "aprobado") {
      return { ok: false, error: "El nivel 1 todavía no aprobó. Aún no es tu turno." };
    }
    if (aprob.decision_n2 !== "pendiente") {
      return { ok: false, error: "El nivel 2 ya fue decidido." };
    }
  }

  const ahora = new Date().toISOString();
  const hdrs = headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;
  const userAgent = hdrs.get("user-agent") ?? null;

  // 2. Actualizar la fila mutable de aprobaciones.
  //    El trigger de segregación valida que el aprobador no sea el elaborador.
  const camposUpdate: Record<string, unknown> =
    nivel === 1
      ? {
          decision_n1: decision,
          fecha_decision_n1: ahora,
          comentario_n1: comentario ?? null,
        }
      : {
          decision_n2: decision,
          fecha_decision_n2: ahora,
          comentario_n2: comentario ?? null,
        };

  // Si esta decisión cierra el flujo, marcar cerrada_en:
  //  - cualquier rechazo cierra
  //  - aprobación de N2 cierra
  const cierra =
    decision === "rechazado" || (nivel === 2 && decision === "aprobado");
  if (cierra) {
    camposUpdate.cerrada_en = ahora;
  }

  const { error: errUpd } = await supabase
    .from("aprobaciones")
    .update(camposUpdate)
    .eq("id", aprobacionId);

  if (errUpd) {
    // El trigger de segregación lanza excepción si el aprobador == elaborador.
    const msg = errUpd.message.includes("segregac")
      ? "No podés aprobar un documento que vos mismo elaboraste (segregación de funciones)."
      : `No se pudo registrar la decisión: ${errUpd.message}`;
    return { ok: false, error: msg };
  }

  // 3. Registrar la decisión en la tabla inmutable (evidencia forense).
  const { error: errDec } = await supabase.from("decisiones_aprobacion").insert({
    aprobacion_id: aprobacionId,
    version_id: aprob.version_id,
    usuario_id: usuarioId,
    nivel,
    decision,
    comentario: comentario ?? null,
    timestamp_decision: ahora,
    ip_origen: ip,
    user_agent: userAgent,
    hash_documento_firmado: version?.hash_archivo_principal ?? null,
    metodo_autenticacion: "supabase_password",
  });

  if (errDec) {
    // La fila mutable ya quedó actualizada; informamos pero no abortamos el flujo.
    return {
      ok: false,
      error: `La decisión se guardó pero falló el registro forense: ${errDec.message}`,
    };
  }

  // 4. Sincronizar el estado de la versión.
  //    Los triggers de versiones sincronizan estado del documento y vigencia.
  let nuevoEstadoVersion: string | null = null;
  if (decision === "rechazado") {
    nuevoEstadoVersion = "rechazado";
  } else if (nivel === 2 && decision === "aprobado") {
    nuevoEstadoVersion = "aprobado";
  }

  if (nuevoEstadoVersion) {
    const campos: Record<string, unknown> = { estado: nuevoEstadoVersion };
    if (nuevoEstadoVersion === "aprobado") {
      campos.fecha_aprobado = ahora;
      campos.es_vigente = true;
    } else {
      campos.fecha_rechazado = ahora;
    }

    const { error: errVer } = await supabase
      .from("versiones")
      .update(campos)
      .eq("id", aprob.version_id);

    if (errVer) {
      return {
        ok: false,
        error: `La decisión se registró pero no se pudo actualizar el estado del documento: ${errVer.message}`,
      };
    }
  }

  revalidatePath("/aprobaciones");
  revalidatePath("/dashboard");
  revalidatePath("/documentos");
  if (aprob.version_id) {
    revalidatePath(`/documentos/${aprob.version_id}`);
  }

  return { ok: true, decision, nivel };
}
