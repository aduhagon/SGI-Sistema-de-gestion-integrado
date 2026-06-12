// ─────────────────────────────────────────────────────────────────────────────
// SNIPPET — agregar al final de: app/(app)/riesgos/actions.ts
//
// Helper que pide a la base un código sugerido para el riesgo, según el proceso
// y la categoría. Usa la función fn_sugerir_codigo_riesgo (verificada en la base:
// devuelve por ejemplo "R-01-01" para riesgo y "O-01-01" para oportunidad).
//
// Devuelve el código sugerido como string, o null si algo falla (el form
// simplemente no prellena y el usuario escribe a mano).
// ─────────────────────────────────────────────────────────────────────────────

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
