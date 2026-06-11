"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { indicadorSchema } from "@/lib/schemas/indicador";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoIndicador =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarIndicador(
  _prev: EstadoIndicador,
  formData: FormData,
): Promise<EstadoIndicador> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = indicadorSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    procesoId: formData.get("procesoId"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    formula: formData.get("formula") || undefined,
    unidad: formData.get("unidad") || undefined,
    meta: formData.get("meta") ?? "",
    metaMinima: formData.get("metaMinima") ?? "",
    metaMaxima: formData.get("metaMaxima") ?? "",
    sentido: formData.get("sentido"),
    periodicidad: formData.get("periodicidad"),
    responsablePuestoId: formData.get("responsablePuestoId") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpioTxt = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    codigo: i.codigo,
    proceso_id: i.procesoId,
    nombre: i.nombre,
    descripcion: limpioTxt(i.descripcion),
    formula: limpioTxt(i.formula),
    unidad: limpioTxt(i.unidad),
    meta: i.meta,
    meta_minima: i.metaMinima,
    meta_maxima: i.metaMaxima,
    sentido: i.sentido,
    periodicidad: i.periodicidad,
    responsable_puesto_id: limpioTxt(i.responsablePuestoId),
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("indicadores")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("indicadores").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/indicadores");
  return { ok: true };
}

export async function eliminarIndicador(id: string): Promise<EstadoIndicador> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("indicadores")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde el módulo de indicadores",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/indicadores");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("uq_indicadores_codigo") || msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un indicador con ese código.";
  if (msg.includes("chk_indicadores_codigo"))
    return "El código son 2 a 30 caracteres: mayúsculas, números, guion o guion bajo.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar indicadores.";
  return `No se pudo guardar: ${msg}`;
}
