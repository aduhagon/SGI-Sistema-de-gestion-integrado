"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearCoberturaSchema } from "@/lib/schemas/cobertura";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoCobertura =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function agregarCobertura(
  _estadoPrevio: EstadoCobertura,
  formData: FormData,
): Promise<EstadoCobertura> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = crearCoberturaSchema.safeParse({
    documentoId: formData.get("documentoId"),
    requisitoId: formData.get("requisitoId"),
    tipoCobertura: formData.get("tipoCobertura"),
    seccionDocumento: formData.get("seccionDocumento") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const { documentoId, requisitoId, tipoCobertura, seccionDocumento, observaciones } =
    parsed.data;

  // ¿Ya existe (incluso eliminada lógicamente)? El índice único es (documento, requisito).
  const { data: existente } = await supabase
    .from("coberturas")
    .select("id, activo, eliminado_en")
    .eq("documento_id", documentoId)
    .eq("requisito_id", requisitoId)
    .maybeSingle();

  if (existente) {
    if (existente.activo && !existente.eliminado_en) {
      return {
        ok: false,
        error: "Este documento ya está vinculado a ese requisito.",
        campo: "requisitoId",
      };
    }
    // Reactivar la cobertura existente en vez de insertar (evita violar el índice único).
    const { error: errReact } = await supabase
      .from("coberturas")
      .update({
        activo: true,
        eliminado_en: null,
        eliminado_por: null,
        eliminado_motivo: null,
        tipo_cobertura: tipoCobertura,
        seccion_documento: seccionDocumento ?? null,
        observaciones: observaciones ?? null,
        actualizado_en: new Date().toISOString(),
        actualizado_por: usuarioId,
      })
      .eq("id", existente.id);

    if (errReact) {
      return { ok: false, error: `No se pudo reactivar la cobertura: ${errReact.message}` };
    }
  } else {
    const { error: errIns } = await supabase.from("coberturas").insert({
      documento_id: documentoId,
      requisito_id: requisitoId,
      tipo_cobertura: tipoCobertura,
      seccion_documento: seccionDocumento ?? null,
      observaciones: observaciones ?? null,
      creado_por: usuarioId,
    });

    if (errIns) {
      return { ok: false, error: `No se pudo crear la cobertura: ${errIns.message}` };
    }
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/cumplimiento");
  return { ok: true };
}

export async function eliminarCobertura(
  documentoId: string,
  coberturaId: string,
): Promise<EstadoCobertura> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida." };
  }

  // Soft delete, coherente con el resto del sistema.
  const { error } = await supabase
    .from("coberturas")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Desvinculado desde el detalle del documento",
    })
    .eq("id", coberturaId);

  if (error) {
    return { ok: false, error: `No se pudo eliminar la cobertura: ${error.message}` };
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/cumplimiento");
  return { ok: true };
}
