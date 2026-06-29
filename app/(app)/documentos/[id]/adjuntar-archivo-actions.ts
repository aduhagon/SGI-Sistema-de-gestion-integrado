"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarArchivo } from "@/lib/schemas/documento";
import { calcularSha256, obtenerExtension, generarStoragePath } from "@/lib/upload/hash";

export type EstadoAdjuntar =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Adjunta (o reemplaza) el archivo principal de la versión en borrador de un
 * documento, sin crear una versión nueva. Pensado para:
 *   - documentos creados en borrador sin archivo, y
 *   - versiones reabiertas tras un rechazo, que se corrigen antes de reenviar.
 *
 * Solo opera sobre versiones en estado borrador o confeccionado (no toca
 * versiones ya enviadas a aprobación, aprobadas u obsoletas).
 */
export async function adjuntarArchivo(
  documentoId: string,
  _prev: EstadoAdjuntar,
  formData: FormData,
): Promise<EstadoAdjuntar> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elegí un archivo para adjuntar." };
  }
  const errorArchivo = validarArchivo(file);
  if (errorArchivo) {
    return { ok: false, error: errorArchivo };
  }

  // Versión más reciente del documento.
  const { data: version, error: errVer } = await supabase
    .from("versiones")
    .select("id, numero_version, estado")
    .eq("documento_id", documentoId)
    .eq("activo", true)
    .order("numero_orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errVer || !version) {
    return { ok: false, error: "No se encontró la versión del documento." };
  }

  if (!["borrador", "confeccionado"].includes(version.estado as string)) {
    return {
      ok: false,
      error:
        "Solo se puede adjuntar el archivo a una versión en borrador. Si la versión ya fue enviada o aprobada, creá una nueva versión.",
    };
  }

  // Archivo principal existente de esa versión (para reemplazarlo si ya hay uno).
  const { data: archivoPrevio } = await supabase
    .from("archivos")
    .select("id, storage_bucket, storage_path")
    .eq("version_id", version.id)
    .eq("tipo_archivo", "principal")
    .maybeSingle();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = calcularSha256(buffer);
  const extension = obtenerExtension(file.name);
  const storagePath = generarStoragePath(documentoId, version.numero_version, file.name);
  const bucket = "documentos-principales";

  const { error: errUpload } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (errUpload) {
    return { ok: false, error: `Error subiendo el archivo: ${errUpload.message}` };
  }

  if (archivoPrevio) {
    // Reemplazo: actualizar el registro y borrar el binario anterior del Storage.
    const { error: errUpd } = await supabase
      .from("archivos")
      .update({
        nombre_original: file.name,
        mime_type: file.type,
        extension,
        "tamaño_bytes": buffer.length,
        storage_bucket: bucket,
        storage_path: storagePath,
        hash_sha256: hash,
        estado_procesamiento: "completado",
      })
      .eq("id", archivoPrevio.id);

    if (errUpd) {
      await supabase.storage.from(bucket).remove([storagePath]);
      return { ok: false, error: `Error registrando el archivo: ${errUpd.message}` };
    }
    if (archivoPrevio.storage_path && archivoPrevio.storage_path !== storagePath) {
      await supabase.storage
        .from(archivoPrevio.storage_bucket ?? bucket)
        .remove([archivoPrevio.storage_path]);
    }
  } else {
    const { error: errArchivo } = await supabase.from("archivos").insert({
      version_id: version.id,
      tipo_archivo: "principal",
      orden: 0,
      nombre_original: file.name,
      mime_type: file.type,
      extension,
      "tamaño_bytes": buffer.length,
      storage_bucket: bucket,
      storage_path: storagePath,
      hash_sha256: hash,
      estado_procesamiento: "completado",
    });

    if (errArchivo) {
      await supabase.storage.from(bucket).remove([storagePath]);
      return { ok: false, error: `Error registrando el archivo: ${errArchivo.message}` };
    }
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  return { ok: true };
}
