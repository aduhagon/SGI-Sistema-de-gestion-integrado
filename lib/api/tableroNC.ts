import { createClient } from "@/lib/supabase/server";

/**
 * Tablero histórico de No Conformidades.
 * Cortes por proceso, norma y severidad + evolución mensual.
 * Lógica en funciones SQL fn_nc_por_proceso / _por_norma / _por_severidad /
 * _evolucion_mensual (verificadas en la base).
 */

export type NCGrupo = {
  id: string | null;
  etiqueta: string;
  codigo?: string | null;
  total: number;
  abiertas: number;
  cerradas: number;
  pctCierre: number;
};

export type NCMes = { mes: string; abiertas: number; cerradas: number };

export type TableroNC = {
  porProceso: NCGrupo[];
  porNorma: NCGrupo[];
  porSeveridad: NCGrupo[];
  evolucion: NCMes[];
  totales: { total: number; abiertas: number; cerradas: number };
};

const SEVERIDAD_LABEL: Record<string, string> = {
  alta: "Severidad alta",
  media: "Severidad media",
  baja: "Severidad baja",
};

export async function obtenerTableroNC(): Promise<TableroNC> {
  const supabase = createClient();

  const [proc, norma, sev, evo] = await Promise.all([
    supabase.rpc("fn_nc_por_proceso"),
    supabase.rpc("fn_nc_por_norma"),
    supabase.rpc("fn_nc_por_severidad"),
    supabase.rpc("fn_nc_evolucion_mensual", { p_meses: 12 }),
  ]);

  const porProceso: NCGrupo[] = (proc.data ?? []).map((r: any) => ({
    id: r.proceso_id, etiqueta: r.nombre, codigo: r.codigo,
    total: r.total, abiertas: r.abiertas, cerradas: r.cerradas, pctCierre: r.pct_cierre,
  }));

  const porNorma: NCGrupo[] = (norma.data ?? []).map((r: any) => ({
    id: r.norma_id, etiqueta: r.nombre_corto, codigo: null,
    total: r.total, abiertas: r.abiertas, cerradas: r.cerradas, pctCierre: r.pct_cierre,
  }));

  const porSeveridad: NCGrupo[] = (sev.data ?? []).map((r: any) => ({
    id: r.severidad, etiqueta: SEVERIDAD_LABEL[r.severidad] ?? r.severidad, codigo: null,
    total: r.total, abiertas: r.abiertas, cerradas: r.cerradas, pctCierre: r.pct_cierre,
  }));

  const evolucion: NCMes[] = (evo.data ?? []).map((r: any) => ({
    mes: r.mes, abiertas: r.abiertas, cerradas: r.cerradas,
  }));

  // Totales consolidados (desde el corte por severidad, que cubre todas las NC).
  const totales = porSeveridad.reduce(
    (acc, g) => ({
      total: acc.total + g.total,
      abiertas: acc.abiertas + g.abiertas,
      cerradas: acc.cerradas + g.cerradas,
    }),
    { total: 0, abiertas: 0, cerradas: 0 },
  );

  return { porProceso, porNorma, porSeveridad, evolucion, totales };
}
