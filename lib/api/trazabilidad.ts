import { createClient } from "@/lib/supabase/server";

/**
 * Trazabilidad de actores del ciclo CAPA y del ciclo de auditoría.
 *
 * La fuente de verdad son las columnas `*_por*` de no_conformidades /
 * hallazgos / acciones / auditorias, que un trigger de base
 * (fn_registrar_actor_transicion) completa en cada transición terminal, más
 * la tabla append-only `decisiones_informe_auditoria` para el ciclo del
 * informe (emitir → devolver → re-emitir → aprobar cierre).
 *
 * El puesto viene resuelto A LA FECHA DEL ACTO, no al día de hoy: si la
 * persona cambió de puesto después, la ficha sigue mostrando el que tenía
 * cuando firmó. Eso lo hace fn_puesto_usuario_a_fecha en la base.
 */

export type EtapaTrazabilidad =
  // ciclo CAPA
  | "apertura"
  | "reapertura"
  | "verificacion"
  | "cierre"
  | "aceptacion_riesgo"
  | "accion_completada"
  | "accion_cancelada"
  | "deteccion"
  // ciclo de auditoría
  | "planificacion"
  | "inicio"
  | "emitido"
  | "devuelto"
  | "cierre_aprobado"
  | "cancelacion";

export type PasoTrazabilidad = {
  orden: number;
  etapa: EtapaTrazabilidad;
  usuarioId: string | null;
  persona: string | null;
  puesto: string | null;
  fecha: string | null;
  detalle: string | null;
  /**
   * Según la etapa: resultado de la verificación ('eficaz',
   * 'parcialmente_eficaz', 'no_eficaz'), 'forzado', 'externo', o la vuelta
   * del ciclo del informe ('vuelta 1', 'vuelta 2', …).
   */
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

/**
 * Recorrido de actores de una auditoría: planificación, inicio, y todas las
 * vueltas del ciclo del informe. Cada emisión y cada devolución quedan como
 * pasos separados, no sólo la última.
 */
export async function obtenerTrazabilidadAuditoria(
  auditoriaId: string,
): Promise<PasoTrazabilidad[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_trazabilidad_auditoria", {
    p_auditoria_id: auditoriaId,
  });

  if (error) return [];
  return ((data ?? []) as any[]).map(mapear);
}
