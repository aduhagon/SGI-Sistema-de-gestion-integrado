"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { personaSchema } from "@/lib/schemas/persona";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoPersonaABM =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarPersona(
  _prev: EstadoPersonaABM,
  formData: FormData,
): Promise<EstadoPersonaABM> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = personaSchema.safeParse({
    id: formData.get("id") || undefined,
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email") || undefined,
    documentoIdentidad: formData.get("documentoIdentidad") || undefined,
    telefono: formData.get("telefono") || undefined,
    areaId: formData.get("areaId") || undefined,
    esExterna: formData.get("esExterna") === "on",
    organizacionExterna: formData.get("organizacionExterna") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    nombre: i.nombre,
    apellido: i.apellido,
    email: limpio(i.email),
    documento_identidad: limpio(i.documentoIdentidad),
    telefono: limpio(i.telefono),
    area_id: limpio(i.areaId),
    es_externa: i.esExterna,
    organizacion_externa: i.esExterna ? limpio(i.organizacionExterna) : null,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("personas")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("personas").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/personas");
  revalidatePath("/configuracion");
  return { ok: true };
}

// Baja lógica de una persona: la marca inactiva con fecha y motivo.
export async function darDeBajaPersona(
  id: string,
  motivo: string,
): Promise<EstadoPersonaABM> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("personas")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: motivo || "Baja desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo dar de baja: ${error.message}` };

  revalidatePath("/configuracion/personas");
  revalidatePath("/configuracion");
  return { ok: true };
}

// Reactivar una persona dada de baja.
export async function reactivarPersona(id: string): Promise<EstadoPersonaABM> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("personas")
    .update({
      activo: true,
      eliminado_en: null,
      eliminado_por: null,
      eliminado_motivo: null,
      actualizado_en: new Date().toISOString(),
      actualizado_por: usuarioId,
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo reactivar: ${error.message}` };

  revalidatePath("/configuracion/personas");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("uq_personas_documento") || msg.includes("documento_identidad"))
    return "Ya existe una persona con ese documento de identidad.";
  if (msg.includes("chk_personas_email"))
    return "El email no tiene un formato válido.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar personas.";
  return `No se pudo guardar: ${msg}`;
}
