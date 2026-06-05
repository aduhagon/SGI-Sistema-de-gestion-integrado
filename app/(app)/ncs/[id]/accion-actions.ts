"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearAccionSchema, verificacionEficaciaSchema } from "@/lib/schemas/accion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoAccion } from "@/lib/api/acciones";

export type EstadoAccion =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function crearAccion(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = crearAccionSchema.safeParse({
    noConformidadId: formData.get("noConformidadId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    tipo: formData.get("tipo"),
    prioridad: formData.get("prioridad") || "media",
    responsableId: formData.get("responsableId"),
    fechaLimite: formData.get("fechaLimite"),
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;
  const codigo = await generarCodigoAccion();

  const { error } = await supabase.from("acciones").insert({
    codigo,
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo: input.tipo,
    prioridad: input.prioridad,
    no_conformidad_id: input.noConformidadId,
    responsable_id: input.responsableId,
    fecha_limite: input.fechaLimite,
    estado: "planificada",
    creado_por: usuarioId,
  });

  if (error) {
    const msg = error.message.includes("chk_acciones_codigo")
      ? "Error generando el código de la acción. Reintentá."
      : `No se pudo crear la acción: ${error.message}`;
    return { ok: false, error: msg };
  }

  // Al haber acciones, la NC pasa a 'en_tratamiento' si estaba en análisis/abierta.
  const { data: nc } = await supabase
    .from("no_conformidades")
    .select("estado")
    .eq("id", input.noConformidadId)
    .maybeSingle();
  if (nc && ["abierta", "en_analisis"].includes(nc.estado as string)) {
    await supabase
      .from("no_conformidades")
      .update({ estado: "en_tratamiento", actualizado_por: usuarioId, actualizado_en: new Date().toISOString() })
      .eq("id", input.noConformidadId);
  }

  revalidatePath(`/ncs/${input.noConformidadId}`);
  return { ok: true };
}

export async function completarAccion(
  ncId: string,
  accionId: string,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("acciones")
    .update({
      estado: "completada",
      fecha_completada: new Date().toISOString(),
      actualizado_por: usuarioId,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", accionId);

  if (error) return { ok: false, error: `No se pudo completar: ${error.message}` };
  revalidatePath(`/ncs/${ncId}`);
  return { ok: true };
}

export async function registrarVerificacion(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = verificacionEficaciaSchema.safeParse({
    noConformidadId: formData.get("noConformidadId"),
    resultado: formData.get("resultado"),
    conclusion: formData.get("conclusion"),
    evidenciaRevisada: formData.get("evidenciaRevisada") || undefined,
    accionesVerificadas: formData.getAll("accionesVerificadas").filter((v): v is string => typeof v === "string"),
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;

  const { error } = await supabase.from("verificaciones_eficacia").insert({
    no_conformidad_id: input.noConformidadId,
    verificador_usuario_id: usuarioId,
    resultado: input.resultado,
    conclusion: input.conclusion,
    evidencia_revisada: input.evidenciaRevisada ?? null,
    acciones_verificadas: input.accionesVerificadas,
  });

  if (error) {
    const msg = error.message.includes("SEGREGACION_FUNCIONES_VERIFICACION")
      ? "No podés verificar la eficacia de acciones de las que sos responsable (segregación de funciones)."
      : `No se pudo registrar la verificación: ${error.message}`;
    return { ok: false, error: msg };
  }

  // Si la verificación es eficaz, la NC puede cerrarse. Lo hacemos automático
  // solo si ya tiene análisis de causa (requisito del CHECK de cierre).
  if (input.resultado === "eficaz") {
    const { data: nc } = await supabase
      .from("no_conformidades")
      .select("analisis_causa_raiz, metodo_analisis")
      .eq("id", input.noConformidadId)
      .maybeSingle();

    if (nc?.analisis_causa_raiz && nc?.metodo_analisis) {
      await supabase
        .from("no_conformidades")
        .update({
          estado: "cerrada",
          fecha_cierre_real: new Date().toISOString(),
          motivo_cierre: "Verificación de eficacia con resultado eficaz.",
          actualizado_por: usuarioId,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", input.noConformidadId);
    }
  }

  revalidatePath(`/ncs/${input.noConformidadId}`);
  return { ok: true };
}
