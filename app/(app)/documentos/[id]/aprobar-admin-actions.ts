"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAprobacionAdmin =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/**
 * Aprobación administrativa (atajo de gestor): marca la última versión del
 * documento como aprobada + vigente, salteando el circuito formal de firmas.
 *
 * Pensado para la etapa de puesta en marcha / carga inicial, cuando el circuito
 * de aprobación todavía no está operativo. Requiere motivo (queda registrado en
 * motivo_cambio de la versión). La integridad de vigencia la maneja el trigger
 * fn_sincronizar_version_vigente (obsoleta anteriores, actualiza el documento).
 */
export async function aprobarDocumentoAdmin(
  documentoId: string,
  motivo: string,
): Promise<ResultadoAprobacionAdmin> {
  if (motivo.trim().length < 5) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesion no valida. Volve a ingresar." };
  }

  const [{ data: esSgiOAdmin }, { data: esSuperadmin }] = await Promise.all([
    supabase.rpc("fn_usuario_es_sgi_o_admin"),
    supabase.rpc("fn_es_superadmin"),
  ]);
  if (!esSgiOAdmin && !esSuperadmin) {
    return {
      ok: false,
      error: "Solo un administrador o responsable del SGI puede usar esta aprobacion.",
    };
  }

  const { data, error } = await supabase.rpc("fn_aprobar_documento_admin", {
    p_documento_id: documentoId,
    p_motivo: motivo.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.aprobado) {
    return { ok: false, error: fila?.mensaje ?? "No se pudo aprobar el documento." };
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  revalidatePath("/cumplimiento");
  revalidatePath("/dashboard");

  return { ok: true, mensaje: fila.mensaje };
}
