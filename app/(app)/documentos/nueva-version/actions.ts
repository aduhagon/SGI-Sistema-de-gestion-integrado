"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nuevaVersionSchema } from "@/lib/schemas/edicion";
import { validarArchivo } from "@/lib/schemas/documento";
import { calcularSha256, obtenerExtension, generarStoragePath } from "@/lib/upload/hash";

export type EstadoNuevaVersion =
  | { ok: true; versionId: string; numeroVersion: string }
  | { ok: false; error: string; campo?: string }
  | null;

/**
 * Server Action que crea una nueva versión de un documento existente.
 *
 * Reglas MSU:
 *   - Cada nueva versión incrementa el número principal: 1.0 -> 2.0 -> 3.0
 *   - El motivo del cambio es OBLIGATORIO (mínimo 10 caracteres)
 *   - La nueva versión se crea en estado "borrador" (no automáticamente vigente)
 *   - Si se sube archivo, se calcula su SHA256 y se sube a Storage
 *
 * Pasos:
 *   1. Validar inputs
 *   2. Validar archivo si se subió
 *   3. Verificar que el documento existe
 *   4. Calcular siguiente número de versión
 *   5. INSERT en versiones (borrador, no vigente)
 *   6. Upload del archivo (si hay)
 *   7. Revalidar y redirigir al detalle
 *
 * NOTA: La nueva versión NO se vuelve vigente automáticamente. Eso pasa por flujo
 * de aprobación (Semana 7). Hasta entonces, el documento mantiene la versión
 * anterior como vigente y la nueva queda como borrador.
 */
export async function crearNuevaVersion(
  documentoId: string,
  _estadoPrevio: EstadoNuevaVersion,
  formData: FormData,
): Promise<EstadoNuevaVersion> {
  const supabase = createClient();

  // ---- 0) Usuario actual ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  // ---- 1) Validar inputs ----
  const parsed = nuevaVersionSchema.safeParse({
    motivo_cambio: formData.get("motivo_cambio"),
  });

  if (!parsed.success) {
    const primerError = parsed.error.issues[0];
    return {
      ok: false,
      error: primerError.message,
      campo: primerError.path.join("."),
    };
  }

  const input = parsed.data;

  // ---- 2) Validar archivo si se subió ----
  const file = formData.get("archivo");
  let archivo: File | null = null;
  if (file instanceof File && file.size > 0) {
    const errorArchivo = validarArchivo(file);
    if (errorArchivo) {
      return { ok: false, error: errorArchivo, campo: "archivo" };
    }
    archivo = file;
  }

  // ---- 3) Verificar que el documento existe ----
  const { data: docExiste } = await supabase
    .from("documentos")
    .select("id, codigo")
    .eq("id", documentoId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!docExiste) {
    return { ok: false, error: "El documento no existe o fue eliminado." };
  }

  // ---- 4) Calcular siguiente número de versión ----
  const { data: ultimaVersion } = await supabase
    .from("versiones")
    .select("numero_orden")
    .eq("documento_id", documentoId)
    .eq("activo", true)
    .order("numero_orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const proximoOrden = (ultimaVersion?.numero_orden ?? 0) + 1;
  const proximoNumero = `${proximoOrden}.0`;

  // ---- 5) INSERT versión ----
  const { data: version, error: errVer } = await supabase
    .from("versiones")
    .insert({
      documento_id: documentoId,
      numero_version: proximoNumero,
      numero_orden: proximoOrden,
      estado: "borrador",
      es_vigente: false,
      motivo_cambio: input.motivo_cambio,
    })
    .select("id")
    .single();

  if (errVer || !version) {
    return {
      ok: false,
      error: `Error al crear la nueva versión: ${errVer?.message ?? "desconocido"}`,
    };
  }

  // ---- 6) Upload del archivo (si hay) ----
  if (archivo) {
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = calcularSha256(buffer);
    const extension = obtenerExtension(archivo.name);
    const storagePath = generarStoragePath(documentoId, proximoNumero, archivo.name);
    const bucket = "documentos-principales";

    const { error: errUpload } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: archivo.type,
        upsert: false,
      });

    if (errUpload) {
      // Rollback: borrar versión creada
      await supabase.from("versiones").delete().eq("id", version.id);
      return {
        ok: false,
        error: `Error subiendo el archivo: ${errUpload.message}`,
      };
    }

    const { error: errArchivo } = await supabase.from("archivos").insert({
      version_id: version.id,
      tipo_archivo: "principal",
      orden: 0,
      nombre_original: archivo.name,
      mime_type: archivo.type,
      extension,
      "tamaño_bytes": buffer.length,
      storage_bucket: bucket,
      storage_path: storagePath,
      hash_sha256: hash,
      estado_procesamiento: "completado",
    });

    if (errArchivo) {
      await supabase.storage.from(bucket).remove([storagePath]);
      await supabase.from("versiones").delete().eq("id", version.id);
      return {
        ok: false,
        error: `Error registrando el archivo: ${errArchivo.message}`,
      };
    }
  }

  // ---- 7) Revalidar y redirigir ----
  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentoId}`);

  redirect(`/documentos/${documentoId}?version_creada=${proximoNumero}`);
}
