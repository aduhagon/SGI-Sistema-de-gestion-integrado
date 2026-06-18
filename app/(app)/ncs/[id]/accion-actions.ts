"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearAccionSchema, verificacionEficaciaSchema } from "@/lib/schemas/accion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoAccion } from "@/lib/api/acciones";
import { calcularSha256, obtenerExtension } from "@/lib/upload/hash";

export type EstadoAccion =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

const BUCKET_EVIDENCIA = "evidencias-nc";
const MAX_EVIDENCIA_BYTES = 20 * 1024 * 1024; // 20 MB

export async function crearAccion(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = crearAccionSchema.safeParse({
    noConformidadId: formData.get("noConformidadId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    tipo: formData.get("tipo"),
    prioridad: formData.get("prioridad") || "media",
    responsableId: formData.get("responsableId"),
    fechaLimite: formData.get("fechaLimite"),
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;
  const codigo = await generarCodigoAccion();

  const { error } = await supabase.from("acciones").insert({
    codigo,
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo: input.tipo,
    prioridad: input.prioridad,
    no_conformidad_id: input.noConformidadId,
    responsable_id: input.responsableId,
    fecha_limite: input.fechaLimite,
    estado: "planificada",
    creado_por: usuarioId,
  });

  if (error) {
    const msg = error.message.includes("chk_acciones_codigo")
      ? "Error generando el código de la acción. Reintentá."
      : `No se pudo crear la acción: ${error.message}`;
    return { ok: false, error: msg };
  }

  const { data: nc } = await supabase
    .from("no_conformidades")
    .select("estado")
    .eq("id", input.noConformidadId)
    .maybeSingle();
  if (nc && ["abierta", "en_analisis"].includes(nc.estado as string)) {
    await supabase
      .from("no_conformidades")
      .update({ estado: "en_tratamiento", actualizado_por: usuarioId, actualizado_en: new Date().toISOString() })
      .eq("id", input.noConformidadId);
  }

  revalidatePath(`/ncs/${input.noConformidadId}`);
  return { ok: true };
}

export async function completarAccion(
  ncId: string,
  accionId: string,
  resultado: string,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  if (!resultado || resultado.trim().length < 3) {
    return {
      ok: false,
      error: "Indicá el resultado obtenido para completar la acción (mínimo 3 caracteres).",
    };
  }

  const { error } = await supabase
    .from("acciones")
    .update({
      estado: "completada",
      fecha_completada: new Date().toISOString(),
      resultado_obtenido: resultado.trim(),
      actualizado_por: usuarioId,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", accionId);

  if (error) return { ok: false, error: `No se pudo completar: ${error.message}` };
  revalidatePath(`/ncs/${ncId}`);
  return { ok: true };
}

export async function registrarVerificacion(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = verificacionEficaciaSchema.safeParse({
    noConformidadId: formData.get("noConformidadId"),
    resultado: formData.get("resultado"),
    conclusion: formData.get("conclusion"),
    evidenciaRevisada: formData.get("evidenciaRevisada") || undefined,
    accionesVerificadas: formData.getAll("accionesVerificadas").filter((v): v is string => typeof v === "string"),
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;

  // ----- Archivo de evidencia (opcional) -----
  const file = formData.get("evidenciaArchivo");
  let archivoEvidencia: File | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_EVIDENCIA_BYTES) {
      return { ok: false, error: "El archivo de evidencia supera el máximo de 20 MB.", campo: "evidenciaArchivo" };
    }
    archivoEvidencia = file;
  }

  let evidenciaArchivoId: string | null = null;

  if (archivoEvidencia) {
    const buffer = Buffer.from(await archivoEvidencia.arrayBuffer());
    const hash = calcularSha256(buffer);
    const extension = obtenerExtension(archivoEvidencia.name) || "bin";
    const nombreSeguro = archivoEvidencia.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${input.noConformidadId}/${Date.now()}-${nombreSeguro}`;

    const { error: errUpload } = await supabase.storage
      .from(BUCKET_EVIDENCIA)
      .upload(storagePath, buffer, { contentType: archivoEvidencia.type || "application/octet-stream", upsert: false });

    if (errUpload) {
      return { ok: false, error: `Error subiendo la evidencia: ${errUpload.message}`, campo: "evidenciaArchivo" };
    }

    const { data: archivoRow, error: errArchivo } = await supabase
      .from("archivos")
      .insert({
        contexto: "evidencia_nc",
        no_conformidad_id: input.noConformidadId,
        tipo_archivo: "anexo",
        orden: 0,
        nombre_original: archivoEvidencia.name,
        mime_type: archivoEvidencia.type || "application/octet-stream",
        extension,
        "tamaño_bytes": buffer.length,
        storage_bucket: BUCKET_EVIDENCIA,
        storage_path: storagePath,
        hash_sha256: hash,
        estado_procesamiento: "completado",
        creado_por: usuarioId,
      })
      .select("id")
      .single();

    if (errArchivo || !archivoRow) {
      // limpiar el archivo subido si falla el registro
      await supabase.storage.from(BUCKET_EVIDENCIA).remove([storagePath]);
      return { ok: false, error: `Error registrando la evidencia: ${errArchivo?.message ?? "desconocido"}`, campo: "evidenciaArchivo" };
    }
    evidenciaArchivoId = archivoRow.id;
  }

  // ----- Insert de la verificación -----
  const { error } = await supabase.from("verificaciones_eficacia").insert({
    no_conformidad_id: input.noConformidadId,
    verificador_usuario_id: usuarioId,
    resultado: input.resultado,
    conclusion: input.conclusion,
    evidencia_revisada: input.evidenciaRevisada ?? null,
    evidencia_archivo_id: evidenciaArchivoId,
    acciones_verificadas: input.accionesVerificadas,
  });

  if (error) {
    // si ya habíamos subido evidencia, la dejamos huérfana marcada (no rompe);
    // limpiar archivo + fila para no dejar basura
    if (evidenciaArchivoId) {
      await supabase.from("archivos").delete().eq("id", evidenciaArchivoId);
    }
    const msg = error.message.includes("SEGREGACION_FUNCIONES_VERIFICACION")
      ? (error.message.includes("administrador o responsable del SGI")
          ? "La eficacia solo puede verificarla un administrador o responsable del SGI."
          : "No podés verificar la eficacia de acciones de las que sos responsable (segregación de funciones).")
      : `No se pudo registrar la verificación: ${error.message}`;
    return { ok: false, error: msg };
  }

  // El cierre por 'eficaz' lo gestiona el flujo de cierre (fn_cerrar_nc) y la
  // reapertura por 'no_eficaz' la gestiona el trigger. No cerramos acá.

  revalidatePath(`/ncs/${input.noConformidadId}`);
  return { ok: true };
}
