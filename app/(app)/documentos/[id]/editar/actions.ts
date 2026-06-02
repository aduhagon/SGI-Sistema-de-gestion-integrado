"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { editarMetadataSchema } from "@/lib/schemas/edicion";

export type EstadoEditar =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

/**
 * Server Action que actualiza la metadata de un documento existente.
 *
 * Pasos:
 *   1. Validar inputs con Zod
 *   2. Validar que el documento existe y no está eliminado
 *   3. UPDATE documentos con los campos editables
 *   4. Sincronizar normas: borrar las viejas y crear las nuevas
 *   5. Registrar evento de auditoría manual con el motivo de la edición
 *      (Los triggers de auditoría capturan el UPDATE pero no el motivo textual)
 *
 * NOTA: El UPDATE de documentos dispara automáticamente:
 *   - trg_documentos_actualizado: actualiza actualizado_en
 *   - trg_auditoria_documentos: registra el cambio en eventos_auditoria
 *   - trg_documentos_busqueda_tsv: regenera el vector de búsqueda full-text
 */
export async function editarMetadata(
  documentoId: string,
  _estadoPrevio: EstadoEditar,
  formData: FormData,
): Promise<EstadoEditar> {
  const supabase = createClient();

  // ---- 0) Usuario actual ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  // ---- 1) Validar inputs ----
  const rawNormas = formData.getAll("normas_ids");
  const parsed = editarMetadataSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion_corta: formData.get("descripcion_corta") ?? undefined,
    criticidad: formData.get("criticidad"),
    confidencialidad: formData.get("confidencialidad"),
    idioma: formData.get("idioma"),
    frecuencia_revision: formData.get("frecuencia_revision"),
    requiere_acuse_lectura: formData.get("requiere_acuse_lectura") === "on" ||
                            formData.get("requiere_acuse_lectura") === "true",
    normas_ids: rawNormas.filter((v): v is string => typeof v === "string" && v.length > 0),
    motivo_edicion: formData.get("motivo_edicion"),
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

  // ---- 2) Verificar que el documento existe ----
  const { data: docExiste } = await supabase
    .from("documentos")
    .select("id, codigo")
    .eq("id", documentoId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!docExiste) {
    return { ok: false, error: "El documento no existe o fue eliminado." };
  }

  // ---- 3) UPDATE documento ----
  const { error: errUpd } = await supabase
    .from("documentos")
    .update({
      titulo: input.titulo,
      descripcion_corta: input.descripcion_corta ?? null,
      criticidad: input.criticidad,
      confidencialidad: input.confidencialidad,
      idioma: input.idioma,
      frecuencia_revision: input.frecuencia_revision,
      requiere_acuse_lectura: input.requiere_acuse_lectura,
    })
    .eq("id", documentoId);

  if (errUpd) {
    return {
      ok: false,
      error: `Error actualizando el documento: ${errUpd.message}`,
    };
  }

  // ---- 4) Sincronizar normas ----
  // Estrategia: borrar todas las relaciones existentes y crear las nuevas.
  // Es seguro porque documento_norma no tiene FKs hacia ella desde otras tablas.
  await supabase.from("documento_norma").delete().eq("documento_id", documentoId);

  if (input.normas_ids.length > 0) {
    const { data: versionesVigentes } = await supabase
      .from("versiones_norma")
      .select("id, norma_id")
      .in("norma_id", input.normas_ids)
      .eq("es_version_actual", true);

    if (versionesVigentes && versionesVigentes.length > 0) {
      const rels = versionesVigentes.map((vn, idx) => ({
        documento_id: documentoId,
        version_norma_id: vn.id,
        es_norma_principal: idx === 0,
      }));
      await supabase.from("documento_norma").insert(rels);
    }
  }

  // ---- 5) Revalidar y redirigir ----
  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/dashboard");

  redirect(`/documentos/${documentoId}?editado=1`);
}
