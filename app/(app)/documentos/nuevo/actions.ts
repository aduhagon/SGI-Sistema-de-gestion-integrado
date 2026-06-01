"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearDocumentoSchema, validarArchivo } from "@/lib/schemas/documento";
import { calcularSha256, obtenerExtension, generarStoragePath } from "@/lib/upload/hash";

export type EstadoForm =
  | { ok: true; documentoId: string }
  | { ok: false; error: string; campo?: string }
  | null;

/**
 * Server Action que crea un documento nuevo en estado "borrador".
 *
 * Pasos:
 *   1. Validar inputs con Zod
 *   2. Validar archivo si se subió
 *   3. INSERT documento (criticidad/confidencialidad heredadas del tipo)
 *   4. INSERT versión 1.0 en borrador
 *   5. Si hay archivo: subir a Storage + INSERT archivo
 *   6. INSERT relaciones documento_norma (si hay normas seleccionadas)
 *   7. Vincular el usuario actual como dueño y elaborador
 *
 * Si algo falla en el medio, hace rollback manual de lo creado.
 */
export async function crearDocumento(
  _estadoPrevio: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const supabase = createClient();

  // ---- 0) Obtener usuario actual ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const { data: usuarioFila } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!usuarioFila) {
    return {
      ok: false,
      error: "Tu cuenta de autenticación no está vinculada a un usuario del SGI. Contactá a un administrador.",
    };
  }

  // ---- 1) Validar inputs con Zod ----
  const rawNormas = formData.getAll("normas_ids");
  const parsed = crearDocumentoSchema.safeParse({
    codigo: formData.get("codigo"),
    titulo: formData.get("titulo"),
    descripcion_corta: formData.get("descripcion_corta") ?? undefined,
    tipo_documental_id: formData.get("tipo_documental_id"),
    proceso_principal_id: formData.get("proceso_principal_id"),
    normas_ids: rawNormas.filter((v): v is string => typeof v === "string" && v.length > 0),
    motivo_creacion: formData.get("motivo_creacion") ?? undefined,
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

  // ---- 3) Verificar que el código no esté duplicado ----
  const { data: codigoExiste } = await supabase
    .from("documentos")
    .select("id")
    .eq("codigo", input.codigo)
    .is("eliminado_en", null)
    .maybeSingle();
  if (codigoExiste) {
    return {
      ok: false,
      error: `Ya existe un documento con el código "${input.codigo}". Elegí otro.`,
      campo: "codigo",
    };
  }

  // ---- 4) Buscar defaults del tipo documental ----
  const { data: tipo } = await supabase
    .from("tipos_documentales")
    .select("criticidad_default, confidencialidad_default, frecuencia_revision_default, requiere_acuse_lectura")
    .eq("id", input.tipo_documental_id)
    .maybeSingle();
  if (!tipo) {
    return { ok: false, error: "El tipo documental seleccionado no existe." };
  }

  // ---- 5) INSERT documento ----
  const { data: documento, error: errDoc } = await supabase
    .from("documentos")
    .insert({
      codigo: input.codigo,
      titulo: input.titulo,
      descripcion_corta: input.descripcion_corta ?? null,
      tipo_documental_id: input.tipo_documental_id,
      proceso_principal_id: input.proceso_principal_id,
      dueno_usuario_id: usuarioFila.id,
      criticidad: tipo.criticidad_default,
      confidencialidad: tipo.confidencialidad_default,
      frecuencia_revision: tipo.frecuencia_revision_default,
      requiere_acuse_lectura: tipo.requiere_acuse_lectura,
      estado_actual: "borrador",
    })
    .select("id")
    .single();

  if (errDoc || !documento) {
    return {
      ok: false,
      error: `Error al crear el documento: ${errDoc?.message ?? "desconocido"}`,
    };
  }

  // ---- 6) INSERT versión 1.0 borrador ----
  const { data: version, error: errVer } = await supabase
    .from("versiones")
    .insert({
      documento_id: documento.id,
      numero_version: "1.0",
      numero_orden: 1,
      estado: "borrador",
      es_vigente: false,
      motivo_cambio: input.motivo_creacion ?? "Creación inicial del documento",
    })
    .select("id")
    .single();

  if (errVer || !version) {
    // Rollback: borrar documento creado
    await supabase.from("documentos").delete().eq("id", documento.id);
    return {
      ok: false,
      error: `Error al crear la versión inicial: ${errVer?.message ?? "desconocido"}`,
    };
  }

  // ---- 7) Si hay archivo: subirlo a Storage + INSERT archivo ----
  if (archivo) {
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = calcularSha256(buffer);
    const extension = obtenerExtension(archivo.name);
    const storagePath = generarStoragePath(documento.id, "1.0", archivo.name);
    const bucket = "documentos-principales";

    const { error: errUpload } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: archivo.type,
        upsert: false,
      });

    if (errUpload) {
      // Rollback: borrar versión y documento
      await supabase.from("versiones").delete().eq("id", version.id);
      await supabase.from("documentos").delete().eq("id", documento.id);
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
      // Rollback total
      await supabase.storage.from(bucket).remove([storagePath]);
      await supabase.from("versiones").delete().eq("id", version.id);
      await supabase.from("documentos").delete().eq("id", documento.id);
      return {
        ok: false,
        error: `Error registrando el archivo: ${errArchivo.message}`,
      };
    }
  }

  // ---- 8) Asociar normas seleccionadas (usando la versión vigente de cada norma) ----
  if (input.normas_ids.length > 0) {
    // Para cada norma seleccionada, obtener su versión vigente actual
    const { data: versionesVigentes } = await supabase
      .from("versiones_norma")
      .select("id, norma_id")
      .in("norma_id", input.normas_ids)
      .eq("es_version_actual", true);

    if (versionesVigentes && versionesVigentes.length > 0) {
      const rels = versionesVigentes.map((vn, idx) => ({
        documento_id: documento.id,
        version_norma_id: vn.id,
        es_norma_principal: idx === 0, // la primera seleccionada queda como principal
      }));
      await supabase.from("documento_norma").insert(rels);
    }
  }

  // ---- 9) Registrar usuario como elaborador ----
  await supabase.from("documento_elaborador").insert({
    documento_id: documento.id,
    usuario_id: usuarioFila.id,
  });

  // ---- 10) Revalidar caches y redirigir al detalle ----
  revalidatePath("/documentos");
  revalidatePath("/dashboard");
  revalidatePath(`/procesos/${input.proceso_principal_id}`);

  redirect(`/documentos/${documento.id}?creado=1`);
}
