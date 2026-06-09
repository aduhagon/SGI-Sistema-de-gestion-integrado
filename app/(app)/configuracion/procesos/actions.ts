"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { procesoSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarProceso(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = procesoSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    codigoNumerico: formData.get("codigoNumerico") || undefined,
    nombre: formData.get("nombre"),
    descripcionCorta: formData.get("descripcionCorta") || undefined,
    tipo: formData.get("tipo"),
    procesoPadreId: formData.get("procesoPadreId") || undefined,
    ordenVisualizacion: formData.get("ordenVisualizacion") || 0,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  // Evitar que un proceso sea su propio padre.
  if (esEdicion && i.procesoPadreId && i.procesoPadreId === i.id) {
    return { ok: false, error: "Un proceso no puede ser su propio proceso padre." };
  }

  const payload = {
    codigo: i.codigo,
    codigo_numerico: limpio(i.codigoNumerico),
    nombre: i.nombre,
    descripcion_corta: limpio(i.descripcionCorta),
    tipo: i.tipo,
    proceso_padre_id: limpio(i.procesoPadreId),
    orden_visualizacion: i.ordenVisualizacion,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("procesos")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("procesos").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/procesos");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarProceso(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("procesos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/procesos");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("procesos_codigo_key") || msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un proceso con ese código.";
  if (msg.includes("chk_procesos_codigo_numerico"))
    return "El código numérico debe ser exactamente 2 dígitos.";
  if (msg.includes("chk_procesos_codigo"))
    return "El código solo admite mayúsculas, números, guion y guion bajo.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar procesos.";
  return `No se pudo guardar: ${msg}`;
}
