"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { versionNormaSchema } from "@/lib/schemas/normativa";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoNormativa =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarVersionNorma(
  _prev: EstadoNormativa,
  formData: FormData,
): Promise<EstadoNormativa> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = versionNormaSchema.safeParse({
    id: formData.get("id") || undefined,
    normaId: formData.get("normaId"),
    version: formData.get("version"),
    nombreVersion: formData.get("nombreVersion") || undefined,
    fechaPublicacion: formData.get("fechaPublicacion") || undefined,
    fechaVigenciaDesde: formData.get("fechaVigenciaDesde") || undefined,
    esVersionActual: formData.get("esVersionActual") === "on",
    urlDescarga: formData.get("urlDescarga") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    norma_id: i.normaId,
    version: i.version,
    nombre_version: limpio(i.nombreVersion),
    fecha_publicacion: limpio(i.fechaPublicacion),
    fecha_vigencia_desde: limpio(i.fechaVigenciaDesde),
    es_version_actual: i.esVersionActual,
    url_descarga: limpio(i.urlDescarga),
  };

  // Si se marca como versión actual, desmarcar las demás de la misma norma.
  if (i.esVersionActual) {
    await supabase
      .from("versiones_norma")
      .update({ es_version_actual: false })
      .eq("norma_id", i.normaId)
      .neq("id", esEdicion ? i.id! : "00000000-0000-0000-0000-000000000000");
  }

  if (esEdicion) {
    const { error } = await supabase
      .from("versiones_norma")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("versiones_norma").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath(`/configuracion/normas/${i.normaId}`);
  return { ok: true };
}

export async function eliminarVersionNorma(id: string, normaId: string): Promise<EstadoNormativa> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("versiones_norma")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminada desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath(`/configuracion/normas/${normaId}`);
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe esa versión para esta norma.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar versiones de normas.";
  return `No se pudo guardar: ${msg}`;
}
