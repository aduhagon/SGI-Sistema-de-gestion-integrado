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
  riesgos: "Riesgos",
  no_conformidades: "No conformidades",
  acciones: "Acciones de tratamiento",
  documentos: "Documentos por revisar",
};

// Orden de presentación de las secciones en la pantalla.
const ORDEN_MODULO = ["aprobaciones", "no_conformidades", "acciones", "riesgos", "documentos"];

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
    return [];
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
