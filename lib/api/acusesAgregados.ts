import { createClient } from "@/lib/supabase/server";

/**
 * Vistas agregadas de acuses de lectura, complementarias a la vista por usuario:
 *  - por proceso (según el proceso del documento del acuse)
 *  - por gerencia (según la gerencia de la persona, vía su puesto vigente)
 *
 * La métrica central es el % de acuses firmados. Lógica en las funciones SQL
 * fn_acuses_por_proceso() y fn_acuses_por_gerencia() (verificadas en la base).
 */

export type AcusesGrupo = {
  id: string | null;
  etiqueta: string;
  codigo?: string | null;
  total: number;
  firmados: number;
  pendientes: number;
  vencidos: number;
  pctCumplimiento: number;
};

export async function obtenerAcusesPorProceso(): Promise<AcusesGrupo[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_acuses_por_proceso");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.proceso_id,
    etiqueta: r.nombre,
    codigo: r.codigo,
    total: r.total,
    firmados: r.firmados,
    pendientes: r.pendientes,
    vencidos: r.vencidos,
    pctCumplimiento: r.pct_cumplimiento,
  }));
}

export async function obtenerAcusesPorGerencia(): Promise<AcusesGrupo[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_acuses_por_gerencia");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.gerencia_id,
    etiqueta: r.gerencia_nombre,
    codigo: null,
    total: r.total,
    firmados: r.firmados,
    pendientes: r.pendientes,
    vencidos: r.vencidos,
    pctCumplimiento: r.pct_cumplimiento,
  }));
}
