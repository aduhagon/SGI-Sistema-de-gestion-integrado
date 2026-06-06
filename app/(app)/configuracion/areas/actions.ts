"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { areaSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarArea(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = areaSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;
  const esEdicion = input.id && input.id !== "";

  if (esEdicion) {
    const { error } = await supabase
      .from("areas")
      .update({
        codigo: input.codigo,
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        actualizado_en: new Date().toISOString(),
        actualizado_por: usuarioId,
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("areas").insert({
      codigo: input.codigo,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      creado_por: usuarioId,
    });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/areas");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarArea(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("areas")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminada desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/areas");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un área con ese código.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar áreas.";
  return `No se pudo guardar: ${msg}`;
}
