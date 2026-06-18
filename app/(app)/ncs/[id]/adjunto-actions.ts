"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { calcularSha256, obtenerExtension } from "@/lib/upload/hash";

export type EstadoAdjunto =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const BUCKET = "evidencias-nc";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Sube un archivo como adjunto de evidencia del PROBLEMA de la NC
 * (contexto 'adjunto_nc'). La RLS de la base exige que el actor sea quien
 * abrió la NC (no_conformidades.creado_por); acá replicamos esa validación
 * para dar un mensaje claro antes de tocar Storage.
 */
export async function subirAdjuntoNC(
  _prev: EstadoAdjunto,
  formData: FormData,
): Promise<EstadoAdjunto> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const ncId = formData.get("noConformidadId");
  if (typeof ncId !== "string" || !ncId) {
    return { ok: false, error: "No conformidad inválida." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elegí un archivo para adjuntar." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "El archivo supera el máximo de 20 MB." };
  }

  // Validar que el actor sea el creador de la NC (mismo criterio que la RLS).
  const { data: nc } = await supabase
    .from("no_conformidades")
    .select("creado_por")
    .eq("id", ncId)
    .maybeSingle();
  if (!nc) return { ok: false, error: "No conformidad no encontrada." };
  if (nc.creado_por !== usuarioId) {
    return { ok: false, error: "Solo quien abrió la no conformidad puede adjuntar evidencia." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = calcularSha256(buffer);
  const extension = obtenerExtension(file.name) || "bin";
  const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ncId}/adjuntos/${Date.now()}-${nombreSeguro}`;

  const { error: errUpload } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream", upsert: false });

  if (errUpload) {
    return { ok: false, error: `Error subiendo el archivo: ${errUpload.message}` };
  }

  const { error: errArchivo } = await supabase.from("archivos").insert({
    contexto: "adjunto_nc",
    no_conformidad_id: ncId,
    tipo_archivo: "anexo",
    orden: 0,
    nombre_original: file.name,
    mime_type: file.type || "application/octet-stream",
    extension,
    "tamaño_bytes": buffer.length,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    hash_sha256: hash,
    estado_procesamiento: "completado",
    creado_por: usuarioId,
  });

  if (errArchivo) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    const msg = errArchivo.message.includes("row-level security")
      ? "Solo quien abrió la no conformidad puede adjuntar evidencia."
      : `Error registrando el archivo: ${errArchivo.message}`;
    return { ok: false, error: msg };
  }

  revalidatePath(`/ncs/${ncId}`);
  return { ok: true };
}

/**
 * Quita un adjunto (soft delete, coherente con el resto del sistema).
 * Solo el creador del archivo o el SGI puede (la RLS de UPDATE ya lo permite).
 */
export async function quitarAdjuntoNC(
  ncId: string,
  archivoId: string,
): Promise<EstadoAdjunto> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("archivos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Adjunto quitado desde el detalle de la NC",
    })
    .eq("id", archivoId)
    .eq("contexto", "adjunto_nc");

  if (error) return { ok: false, error: `No se pudo quitar el adjunto: ${error.message}` };

  revalidatePath(`/ncs/${ncId}`);
  return { ok: true };
}
