import { createClient } from "@/lib/supabase/server";

/**
 * Tablero histórico de No Conformidades.
 * Cortes por proceso, norma y severidad + evolución mensual.
 * Lógica en funciones SQL fn_nc_por_proceso / _por_norma / _por_severidad /
 * _evolucion_mensual (verificadas en la base).
 *
 * Todas las funciones aceptan un rango opcional sobre fecha_apertura
 * (p_desde / p_hasta, inclusivo en ambos extremos). Con ambos en NULL el
 * resultado es el histórico completo.
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

/** Rango de fechas para filtrar el tablero. Fechas en formato 'YYYY-MM-DD'. */
export type RangoFechas = {
  desde: string | null;
  hasta: string | null;
};

const SEVERIDAD_LABEL: Record<string, string> = {
  alta: "Severidad alta",
  media: "Severidad media",
  baja: "Severidad baja",
};

export async function obtenerTableroNC(rango?: RangoFechas): Promise<TableroNC> {
  const supabase = createClient();

  const p_desde = rango?.desde ?? null;
  const p_hasta = rango?.hasta ?? null;

  const [proc, norma, sev, evo] = await Promise.all([
    supabase.rpc("fn_nc_por_proceso", { p_desde, p_hasta }),
    supabase.rpc("fn_nc_por_norma", { p_desde, p_hasta }),
    supabase.rpc("fn_nc_por_severidad", { p_desde, p_hasta }),
    // Si hay rango, la serie de meses la define el rango; p_meses queda de
    // respaldo para el caso sin rango (histórico → últimos 12 meses).
    supabase.rpc("fn_nc_evolucion_mensual", { p_meses: 12, p_desde, p_hasta }),
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
