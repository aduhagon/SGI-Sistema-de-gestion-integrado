"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoObsoletar =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/**
 * Marca un documento como obsoleto (retirado). Obsoleta la versión más reciente;
 * el trigger de sincronización propaga el estado al documento maestro. Requiere
 * motivo, que queda registrado en motivo_obsolescencia + obsoletado_en/por.
 *
 * Aplica tanto a documentos vigentes que se retiran como a borradores que no
 * llegaron a aprobarse y se quieren dejar fuera de circulación sin borrarlos.
 */
export async function obsoletarDocumento(
  documentoId: string,
  motivo: string,
): Promise<ResultadoObsoletar> {
  if (motivo.trim().length < 5) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_obsoletar_documento", {
    p_documento_id: documentoId,
    p_motivo: motivo.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.obsoletado) {
    return { ok: false, error: fila?.mensaje ?? "No se pudo obsoletar el documento." };
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  revalidatePath("/cumplimiento");
  revalidatePath("/dashboard");

  return { ok: true, mensaje: fila.mensaje };
}
