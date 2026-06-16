import { createClient } from "@/lib/supabase/server";

/**
 * Indicadores de salud por proceso, para mostrar en las tarjetas del mapa.
 *
 * Devuelve un mapa procesoId -> conteos. Hace consultas agregadas (no una por
 * proceso), así que es liviano aunque haya muchos procesos.
 *
 * Relaciones verificadas en la base:
 *   - documentos.proceso_principal_id  (no "proceso_id")
 *   - no_conformidades.proceso_id
 *   - indicadores.proceso_id
 * NC "abiertas" = estados abierta | en_analisis | en_tratamiento
 * (cerrada y aceptado_riesgo NO cuentan como abiertas).
 */

export type SaludProceso = {
  documentos: number;
  ncAbiertas: number;
  indicadores: number;
};

export type MapaSaludProcesos = Record<string, SaludProceso>;

const NC_ABIERTAS = ["abierta", "en_analisis", "en_tratamiento"];

export async function obtenerSaludProcesos(): Promise<MapaSaludProcesos> {
  const supabase = createClient();
  const mapa: MapaSaludProcesos = {};

  function asegurar(id: string): SaludProceso {
    if (!mapa[id]) mapa[id] = { documentos: 0, ncAbiertas: 0, indicadores: 0 };
    return mapa[id];
  }

  // Las tres consultas son independientes entre sí: se lanzan en paralelo.
  const [docsR, ncsR, indsR] = await Promise.all([
    supabase
      .from("documentos")
      .select("proceso_principal_id")
      .is("eliminado_en", null),
    supabase
      .from("no_conformidades")
      .select("proceso_id, estado")
      .in("estado", NC_ABIERTAS),
    supabase
      .from("indicadores")
      .select("proceso_id")
      .eq("activo", true),
  ]);

  // Documentos vigentes por proceso.
  for (const d of (docsR.data ?? []) as Array<{ proceso_principal_id: string | null }>) {
    if (d.proceso_principal_id) asegurar(d.proceso_principal_id).documentos += 1;
  }

  // NC abiertas por proceso.
  for (const n of (ncsR.data ?? []) as Array<{ proceso_id: string | null; estado: string }>) {
    if (n.proceso_id) asegurar(n.proceso_id).ncAbiertas += 1;
  }

  // Indicadores activos por proceso.
  for (const i of (indsR.data ?? []) as Array<{ proceso_id: string | null }>) {
    if (i.proceso_id) asegurar(i.proceso_id).indicadores += 1;
  }

  return mapa;
}
