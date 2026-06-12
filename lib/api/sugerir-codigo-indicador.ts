"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Sugiere un código para un indicador según el proceso.
 *
 * Usa la función fn_sugerir_codigo_indicador de la base (verificada):
 *   → "KPI-01-01"
 *
 * Devuelve el código sugerido, o null si algo falla.
 */
export async function sugerirCodigoIndicador(
  procesoId: string,
): Promise<string | null> {
  if (!procesoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sugerir_codigo_indicador", {
    p_proceso_id: procesoId,
  });
  if (error) return null;
  return typeof data === "string" ? data : null;
}
