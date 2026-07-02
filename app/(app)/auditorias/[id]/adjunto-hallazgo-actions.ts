"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { calcularSha256, obtenerExtension } from "@/lib/upload/hash";

export type EstadoAdjuntoHallazgo =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const BUCKET = "evidencias-auditoria";
const MAX_BYTES = 20 * 1024 * 1024;

export async function subirAdjuntoHallazgo(
  _prev: EstadoAdjuntoHallazgo,
  formData: FormData,
): Promise<EstadoAdjuntoHallazgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const auditoriaId = formData.get("auditoriaId");
  const hallazgoId = formData.get("hallazgoId");
  if (typeof auditoriaId !== "string" || !auditoriaId) return { ok: false, error: "Auditoría inválida." };
  if (typeof hallazgoId !== "string" || !hallazgoId) return { ok: false, error: "Hallazgo inválido." };

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elegí un archivo para adjuntar." };
  if (file.size > MAX_BYTES) return { ok: false, error: "El archivo supera el máximo de 20 MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = calcularSha256(buffer);
  const extension = obtenerExtension(file.name) || "bin";
  const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${auditoriaId}/${hallazgoId}/${Date.now()}-${nombreSeguro}`;

  const { error: errUpload } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream", upsert: false });

  if (errUpload) return { ok: false, error: `Error subiendo el archivo: ${errUpload.message}` };

  const { error: errArchivo } = await supabase.from("archivos").insert({
    contexto: "adjunto_hallazgo",
    hallazgo_id: hallazgoId,
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
      ? "Solo el equipo auditor puede adjuntar documentación con la auditoría en curso."
      : `Error registrando el archivo: ${errArchivo.message}`;
    return { ok: false, error: msg };
  }

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}

export async function quitarAdjuntoHallazgo(
  auditoriaId: string,
  archivoId: string,
): Promise<EstadoAdjuntoHallazgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("archivos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Adjunto quitado desde el detalle de la auditoría",
    })
    .eq("id", archivoId)
    .eq("contexto", "adjunto_hallazgo");

  if (error) return { ok: false, error: `No se pudo quitar el adjunto: ${error.message}` };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}
