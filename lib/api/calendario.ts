import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";

export type NivelEvento =
  | "recordatorio"
  | "advertencia"
  | "vencido_hoy"
  | "vencido";

export type ScopeCalendario = "personal" | "global";

export type EventoCalendario = {
  modulo: string;
  entidadId: string;
  codigo: string;
  titulo: string;
  fechaEvento: string; // YYYY-MM-DD, ya calculada en la zona del sistema
  diasRestantes: number;
  nivel: NivelEvento;
  urlDestino: string;
  procesoId: string | null;
  origenTabla: string;
};

export type HuecoCalendario = {
  origen: string;
  etiqueta: string;
  cantidad: number;
};

export type ProcesoFiltro = {
  id: string;
  codigo: string;
  nombre: string;
};

// Etiquetas de los módulos que puede devolver fn_calendario_eventos.
export const MODULO_LABEL_CALENDARIO: Record<string, string> = {
  aprobaciones: "Aprobaciones",
  acuses: "Acuses de lectura",
  riesgos: "Riesgos",
  no_conformidades: "No conformidades",
  acciones: "Acciones de tratamiento",
  documentos: "Documentos por revisar",
  auditorias: "Auditorías",
  hallazgos: "Hallazgos",
  legales: "Requisitos legales",
  certificados: "Certificados",
};

// Color del punto de cada módulo en la grilla. Se usan clases fijas de Tailwind
// (no interpoladas) para que el JIT no las descarte al compilar.
export const MODULO_COLOR_CALENDARIO: Record<string, string> = {
  aprobaciones: "bg-sky-500",
  acuses: "bg-violet-500",
  riesgos: "bg-amber-500",
  no_conformidades: "bg-red-500",
  acciones: "bg-rose-500",
  documentos: "bg-blue-500",
  auditorias: "bg-orange-500",
  hallazgos: "bg-fuchsia-500",
  legales: "bg-pink-500",
  certificados: "bg-slate-500",
};

/**
 * Indica si el usuario actual tiene rol global de admin o responsable SGI.
 *
 * Se usa solo para decidir si se muestra el selector de alcance. La seguridad
 * real la aplica fn_calendario_eventos: si un usuario sin rol pide scope
 * "global", la función cae a "personal" en silencio. Por eso, si esta consulta
 * falla o la RLS la bloquea, devolver false es seguro: se degrada a personal.
 */
export async function esGestorSgi(): Promise<boolean> {
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return false;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("asignaciones_rol_global")
    .select("id, roles_globales!inner(codigo)")
    .eq("usuario_id", usuarioId)
    .is("vigente_hasta", null)
    .in("roles_globales.codigo", ["admin", "responsable_sgi"])
    .limit(1);

  if (error) {
    console.error("[SGI:calendario] esGestorSgi", error);
    return false;
  }

  return (data ?? []).length > 0;
}

/**
 * Eventos del calendario en el rango pedido.
 *
 * A diferencia de fn_pendientes_usuario, que está acotada a un horizonte de
 * 15 días, fn_calendario_eventos acepta una ventana libre y solo devuelve
 * ítems con fecha concreta.
 */
export async function obtenerEventosCalendario(
  desde: string,
  hasta: string,
  scope: ScopeCalendario = "personal",
): Promise<EventoCalendario[]> {
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return [];

  const supabase = createClient();
  const zona = await obtenerZonaHoraria();

  const { data, error } = await supabase.rpc("fn_calendario_eventos", {
    p_usuario_id: usuarioId,
    p_desde: desde,
    p_hasta: hasta,
    p_scope: scope,
    p_zona: zona,
  });

  if (error) {
    console.error("[SGI:calendario] obtenerEventosCalendario", error);
    return [];
  }

  const filas = (data ?? []) as Array<{
    modulo: string;
    entidad_id: string;
    codigo: string;
    titulo: string;
    fecha_evento: string;
    dias_restantes: number;
    nivel: NivelEvento;
    url_destino: string;
    proceso_id: string | null;
    origen_tabla: string;
  }>;

  return filas.map((f) => ({
    modulo: f.modulo,
    entidadId: f.entidad_id,
    codigo: f.codigo,
    titulo: f.titulo,
    fechaEvento: f.fecha_evento,
    diasRestantes: f.dias_restantes,
    nivel: f.nivel,
    urlDestino: f.url_destino,
    procesoId: f.proceso_id,
    origenTabla: f.origen_tabla,
  }));
}

/**
 * Registros que deberían tener fecha y no la tienen. Es el panel que hace
 * visible por qué el calendario está más vacío de lo que debería.
 */
export async function obtenerHuecosCalendario(
  scope: ScopeCalendario = "personal",
): Promise<HuecoCalendario[]> {
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return [];

  const supabase = createClient();

  const { data, error } = await supabase.rpc("fn_calendario_sin_fecha", {
    p_usuario_id: usuarioId,
    p_scope: scope,
  });

  if (error) {
    console.error("[SGI:calendario] obtenerHuecosCalendario", error);
    return [];
  }

  const filas = (data ?? []) as Array<{
    origen: string;
    etiqueta: string;
    cantidad: number;
  }>;

  // La función devuelve todos los orígenes, incluso en cero.
  return filas.filter((f) => f.cantidad > 0);
}

/**
 * Procesos activos para el selector de filtro, en orden de cadena de valor.
 */
export async function obtenerProcesosParaFiltro(): Promise<ProcesoFiltro[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true, nullsFirst: false })
    .order("codigo", { ascending: true });

  if (error) {
    console.error("[SGI:calendario] obtenerProcesosParaFiltro", error);
    return [];
  }

  return (data ?? []) as ProcesoFiltro[];
}
