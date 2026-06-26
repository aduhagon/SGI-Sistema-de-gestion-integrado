"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { riesgoSchema } from "@/lib/schemas/riesgo";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoRiesgo =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarRiesgo(
  _prev: EstadoRiesgo,
  formData: FormData,
): Promise<EstadoRiesgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = riesgoSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    procesoId: formData.get("procesoId"),
    categoria: formData.get("categoria"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    causa: formData.get("causa") || undefined,
    consecuencia: formData.get("consecuencia") || undefined,
    probabilidad: formData.get("probabilidad"),
    impacto: formData.get("impacto"),
    tipoTratamiento: formData.get("tipoTratamiento") || undefined,
    tratamientoPlanificado: formData.get("tratamientoPlanificado") || undefined,
    gradoControl: formData.get("gradoControl") || undefined,
    responsableId: formData.get("responsableId") || undefined,
    fechaRevision: formData.get("fechaRevision") || undefined,
    estado: formData.get("estado"),
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    codigo: i.codigo,
    proceso_id: i.procesoId,
    categoria: i.categoria,
    titulo: i.titulo,
    descripcion: limpio(i.descripcion),
    causa: limpio(i.causa),
    consecuencia: limpio(i.consecuencia),
    probabilidad: i.probabilidad,
    impacto: i.impacto,
    tipo_tratamiento: limpio(i.tipoTratamiento),
    tratamiento_planificado: limpio(i.tratamientoPlanificado),
    grado_control: limpio(i.gradoControl),
    responsable_id: limpio(i.responsableId),
    fecha_revision: limpio(i.fechaRevision),
    estado: i.estado,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("riesgos")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("riesgos").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/riesgos");
  return { ok: true };
}

export async function eliminarRiesgo(id: string): Promise<EstadoRiesgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("riesgos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde el módulo de riesgos",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/riesgos");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("uq_riesgos_codigo") || msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un riesgo con ese código.";
  if (msg.includes("chk_riesgos_codigo"))
    return "El código son 2 a 30 caracteres: mayúsculas, números, guion o guion bajo.";
  if (msg.includes("chk_riesgos_probabilidad") || msg.includes("chk_riesgos_impacto"))
    return "Probabilidad e impacto deben estar entre 1 y 5.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar riesgos.";
  return `No se pudo guardar: ${msg}`;
}
