"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { puestoSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarPuesto(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = puestoSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    areaId: formData.get("areaId") || undefined,
    reportaAId: formData.get("reportaAId") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;
  const esEdicion = input.id && input.id !== "";
  const areaId = input.areaId && input.areaId !== "" ? input.areaId : null;
  const reportaAId =
    input.reportaAId && input.reportaAId !== "" ? input.reportaAId : null;

  if (esEdicion && reportaAId === input.id) {
    return { ok: false, error: "Un puesto no puede reportarse a sí mismo.", campo: "reportaAId" };
  }

  const payload = {
    codigo: input.codigo,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    area_id: areaId,
    reporta_a_id: reportaAId,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("puestos")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", input.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("puestos").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/puestos");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarPuesto(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("puestos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/puestos");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un puesto con ese código.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar puestos.";
  if (msg.includes("chk_puestos_codigo"))
    return "El código solo admite mayúsculas, números, guion y guion bajo.";
  if (msg.includes("reporta_a_id"))
    return "El puesto superior seleccionado no es válido.";
  return `No se pudo guardar: ${msg}`;
}
