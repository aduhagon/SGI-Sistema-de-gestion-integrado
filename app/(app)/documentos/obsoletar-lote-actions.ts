"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoObsoletar =
  | { ok: true; obsoletados: number; omitidos: number }
  | { ok: false; error: string };

/**
 * Marca varios documentos como obsoletos (discontinuados) en lote, con un motivo
 * común. Usa fn_obsoletar_documentos, que valida sesión y motivo, registra
 * autor/fecha y limpia la versión vigente. El trigger de auditoría de la tabla
 * documentos deja registro automático del cambio.
 */
export async function obsoletarDocumentosEnLote(
  documentoIds: string[],
  motivo: string,
): Promise<ResultadoObsoletar> {
  if (documentoIds.length === 0) {
    return { ok: false, error: "No hay documentos seleccionados." };
  }
  if (motivo.trim().length < 5) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_obsoletar_documentos", {
    p_documento_ids: documentoIds,
    p_motivo: motivo.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // La función devuelve una fila con { obsoletados, omitidos }.
  const fila = Array.isArray(data) ? data[0] : data;
  const obsoletados = fila?.obsoletados ?? 0;
  const omitidos = fila?.omitidos ?? 0;

  revalidatePath("/documentos");
  revalidatePath("/cumplimiento");
  revalidatePath("/dashboard");

  return { ok: true, obsoletados, omitidos };
}
