"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Sugiere un código para un riesgo según proceso y categoría.
 *
 * Usa la función fn_sugerir_codigo_riesgo de la base (verificada):
 *   - categoría "riesgo"      → "R-01-01"
 *   - categoría "oportunidad" → "O-01-01"
 *
 * Devuelve el código sugerido, o null si algo falla (el form no prellena y el
 * usuario escribe a mano).
 */
export async function sugerirCodigoRiesgo(
  procesoId: string,
  categoria: string = "riesgo",
): Promise<string | null> {
  if (!procesoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sugerir_codigo_riesgo", {
    p_proceso_id: procesoId,
    p_categoria: categoria, // 'riesgo' | 'oportunidad'
  });
  if (error) return null;
  return typeof data === "string" ? data : null;
}
