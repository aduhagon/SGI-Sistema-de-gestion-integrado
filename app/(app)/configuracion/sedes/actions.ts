"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sedeSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarSede(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = sedeSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    localidad: formData.get("localidad") || undefined,
    provincia: formData.get("provincia") || undefined,
    pais: formData.get("pais") || undefined,
    tipoSede: formData.get("tipoSede") || undefined,
    esSedePrincipal: formData.get("esSedePrincipal") === "on",
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;
  const esEdicion = input.id && input.id !== "";

  const payload = {
    codigo: input.codigo,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    localidad: input.localidad ?? null,
    provincia: input.provincia ?? null,
    pais: input.pais ?? "Argentina",
    tipo_sede: input.tipoSede ?? null,
    es_sede_principal: input.esSedePrincipal,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("sedes")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", input.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("sedes").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/sedes");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarSede(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("sedes")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminada desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/sedes");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe una sede con ese código.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar sedes.";
  return `No se pudo guardar: ${msg}`;
}
