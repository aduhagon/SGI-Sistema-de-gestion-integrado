import { createClient } from "@/lib/supabase/server";

/**
 * Trazabilidad de actores del ciclo CAPA.
 *
 * La fuente de verdad son las columnas `*_por_usuario_id` de
 * no_conformidades / hallazgos / acciones, que un trigger de base
 * (fn_registrar_actor_transicion) completa en cada transición terminal.
 * Por eso alcanza con leer: no hay lógica de resolución acá.
 *
 * El puesto viene resuelto A LA FECHA DEL ACTO, no al día de hoy: si la
 * persona cambió de puesto después, la ficha sigue mostrando el que tenía
 * cuando firmó. Eso lo hace fn_puesto_usuario_a_fecha en la base.
 */

export type EtapaTrazabilidad =
  | "apertura"
  | "reapertura"
  | "verificacion"
  | "cierre"
  | "aceptacion_riesgo"
  | "accion_completada"
  | "accion_cancelada"
  | "deteccion";

export type PasoTrazabilidad = {
  orden: number;
  etapa: EtapaTrazabilidad;
  usuarioId: string | null;
  persona: string | null;
  puesto: string | null;
  fecha: string | null;
  detalle: string | null;
  /** 'eficaz' | 'parcialmente_eficaz' | 'no_eficaz' | 'forzado' | 'externo' */
  marca: string | null;
  /** Código y título de la acción, cuando la etapa es de acción. */
  referencia: string | null;
};

function mapear(f: any): PasoTrazabilidad {
  return {
    orden: f.orden,
    etapa: f.etapa,
    usuarioId: f.usuario_id ?? null,
    persona: f.persona && String(f.persona).trim().length > 0 ? f.persona : null,
    puesto: f.puesto ?? null,
    fecha: f.fecha ?? null,
    detalle: f.detalle ?? null,
    marca: f.marca ?? null,
    referencia: f.referencia ?? null,
  };
}

/** Recorrido completo de actores de una no conformidad. */
export async function obtenerTrazabilidadNC(ncId: string): Promise<PasoTrazabilidad[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_trazabilidad_nc", { p_nc_id: ncId });

  // La trazabilidad es informativa: si falla, la ficha igual tiene que abrir.
  if (error) return [];
  return ((data ?? []) as any[]).map(mapear);
}

/** Recorrido de actores de un hallazgo de auditoría. */
export async function obtenerTrazabilidadHallazgo(
  hallazgoId: string,
): Promise<PasoTrazabilidad[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_trazabilidad_hallazgo", {
    p_hallazgo_id: hallazgoId,
  });

  if (error) return [];
  return ((data ?? []) as any[]).map(mapear);
}
