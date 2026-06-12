// ─────────────────────────────────────────────────────────────────────────────
// SNIPPET — agregar al final de: app/(app)/indicadores/actions.ts
//
// Helper que pide a la base un código sugerido para el indicador, según el
// proceso. Usa fn_sugerir_codigo_indicador (verificada: devuelve "KPI-01-01").
//
// Devuelve el código sugerido como string, o null si algo falla.
// ─────────────────────────────────────────────────────────────────────────────

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
