import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";

export type NivelPendiente = "recordatorio" | "advertencia" | "vencido_hoy" | "vencido";

export type Pendiente = {
  modulo: string;
  entidadId: string;
  codigo: string;
  titulo: string;
  fechaLimite: string | null;
  diasRestantes: number | null;
  nivel: NivelPendiente;
  urlDestino: string;
};

export type GrupoPendientes = {
  modulo: string;
  label: string;
  items: Pendiente[];
};

const MODULO_LABEL: Record<string, string> = {
  aprobaciones: "Aprobaciones de documentos",
  acuses: "Acuses de lectura",
  no_conformidades: "No conformidades",
  acciones: "Acciones de tratamiento",
  hallazgos: "Hallazgos por tratar",
  auditorias: "Auditorías programadas",
  riesgos: "Riesgos",
  indicadores: "Indicadores por medir",
  documentos: "Documentos por revisar",
  controles: "Controles por ejecutar",
};

// Orden de presentación de las secciones en la pantalla.
//
// OJO: el agrupado de abajo itera sobre esta lista, así que un módulo que
// fn_pendientes_usuario devuelva pero que no figure acá se descarta en
// silencio. Al sumar un módulo nuevo en la función SQL hay que agregarlo
// también en esta constante y en MODULO_LABEL.
const ORDEN_MODULO = [
  "aprobaciones",
  "acuses",
  "no_conformidades",
  "acciones",
  "hallazgos",
  "auditorias",
  "controles",
  "riesgos",
  "indicadores",
  "documentos",
];

/**
 * Devuelve los pendientes del usuario actual, agrupados por módulo.
 * La función fn_pendientes_usuario ya calcula el nivel de escalamiento
 * (recordatorio/advertencia/vencido_hoy/vencido) usando la zona del sistema.
 */
export async function obtenerMisPendientes(): Promise<GrupoPendientes[]> {
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return [];

  const supabase = createClient();
  const zona = await obtenerZonaHoraria();

  const { data, error } = await supabase.rpc("fn_pendientes_usuario", {
    p_usuario_id: usuarioId,
    p_zona: zona,
  });

  if (error) {
    console.error("[SGI:pendientes] obtenerMisPendientes", error);
  }

  const filas = (data ?? []) as Array<{
    modulo: string;
    entidad_id: string;
    codigo: string;
    titulo: string;
    fecha_limite: string | null;
    dias_restantes: number | null;
    nivel: NivelPendiente | null;
    url_destino: string;
  }>;

  // La función puede devolver nivel NULL para ítems fuera de ventana
  // (caso borde); los descartamos.
  const items: Pendiente[] = filas
    .filter((f) => f.nivel !== null)
    .map((f) => ({
      modulo: f.modulo,
      entidadId: f.entidad_id,
      codigo: f.codigo,
      titulo: f.titulo,
      fechaLimite: f.fecha_limite,
      diasRestantes: f.dias_restantes,
      nivel: f.nivel as NivelPendiente,
      urlDestino: f.url_destino,
    }));

  items.push(...(await obtenerPendientesControles(supabase, usuarioId, zona)));

  // Agrupar por módulo respetando el orden de presentación.
  const grupos: GrupoPendientes[] = [];
  for (const modulo of ORDEN_MODULO) {
    const delModulo = items.filter((i) => i.modulo === modulo);
    if (delModulo.length > 0) {
      grupos.push({
        modulo,
        label: MODULO_LABEL[modulo] ?? modulo,
        items: delModulo,
      });
    }
  }

  return grupos;
}

async function obtenerPendientesControles(
  supabase: ReturnType<typeof createClient>,
  usuarioId: string,
  zona: string,
): Promise<Pendiente[]> {
  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("persona_id")
    .eq("id", usuarioId)
    .eq("activo", true)
    .maybeSingle();
  if (errorUsuario || !usuario?.persona_id) return [];

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from("persona_puesto")
    .select("puesto_id")
    .eq("persona_id", usuario.persona_id)
    .is("vigente_hasta", null);
  if (errorAsignaciones) return [];

  const puestos = Array.from(new Set((asignaciones ?? []).map((fila) => fila.puesto_id)));
  if (puestos.length === 0) return [];

  const { data, error } = await supabase
    .from("controles")
    .select(
      `id, codigo, nombre, proxima_ejecucion, anticipacion_dias,
       proceso:procesos!controles_proceso_id_fkey (codigo, nombre)`,
    )
    .in("responsable_puesto_id", puestos)
    .eq("estado", "activo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .not("proxima_ejecucion", "is", null)
    .order("proxima_ejecucion");
  if (error) {
    console.error("[SGI:pendientes] controles", error);
    return [];
  }

  const hoy = fechaCalendarioEnZona(zona);
  const pendientes: Pendiente[] = [];
  for (const control of (data ?? []) as any[]) {
    const diasRestantes = diferenciaDias(hoy, control.proxima_ejecucion);
    if (diasRestantes > control.anticipacion_dias) continue;
    const nivel: NivelPendiente = diasRestantes < 0
      ? "vencido"
      : diasRestantes === 0
        ? "vencido_hoy"
        : diasRestantes <= Math.max(1, Math.ceil(control.anticipacion_dias / 2))
          ? "advertencia"
          : "recordatorio";
    pendientes.push({
      modulo: "controles",
      entidadId: control.id,
      codigo: control.codigo,
      titulo: `${control.nombre} · ${control.proceso?.nombre ?? "Proceso"}`,
      fechaLimite: control.proxima_ejecucion,
      diasRestantes,
      nivel,
      urlDestino: `/controles?control=${control.id}`,
    });
  }
  return pendientes;
}

function fechaCalendarioEnZona(zona: string): string {
  const partes = new Intl.DateTimeFormat("en", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function diferenciaDias(desde: string, hasta: string): number {
  const aNumero = (fecha: string) => {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return Date.UTC(anio, mes - 1, dia);
  };
  return Math.round((aNumero(hasta) - aNumero(desde)) / 86_400_000);
}
