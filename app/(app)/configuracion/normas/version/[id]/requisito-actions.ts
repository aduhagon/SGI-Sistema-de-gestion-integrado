"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requisitoSchema } from "@/lib/schemas/normativa";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoNormativa =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarRequisito(
  _prev: EstadoNormativa,
  formData: FormData,
): Promise<EstadoNormativa> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = requisitoSchema.safeParse({
    id: formData.get("id") || undefined,
    versionNormaId: formData.get("versionNormaId"),
    clausula: formData.get("clausula"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    esObligatorio: formData.get("esObligatorio") === "on",
    esCritico: formData.get("esCritico") === "on",
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    version_norma_id: i.versionNormaId,
    clausula: i.clausula,
    titulo: i.titulo,
    descripcion: limpio(i.descripcion),
    es_obligatorio: i.esObligatorio,
    es_critico: i.esCritico,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("requisitos")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("requisitos").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath(`/configuracion/normas/version/${i.versionNormaId}`);
  return { ok: true };
}

export async function eliminarRequisito(id: string, versionId: string): Promise<EstadoNormativa> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("requisitos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath(`/configuracion/normas/version/${versionId}`);
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un requisito con esa cláusula en esta versión.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar requisitos.";
  return `No se pudo guardar: ${msg}`;
}
