import { createClient } from "@/lib/supabase/server";

export type NCLista = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  severidad: string;
  origen: string;
  estado: string;
  fechaApertura: string;
  fechaLimiteCierre: string | null;
  procesoNombre: string | null;
};

export type NCDetalle = NCLista & {
  descripcion: string;
  origenDescripcion: string | null;
  analisisCausaRaiz: string | null;
  metodoAnalisis: string | null;
  requiereAccionInmediata: boolean;
  accionInmediataDescripcion: string | null;
  hallazgoCodigo: string | null;
};

const SELECT_LISTA = `
  id, codigo, titulo, tipo, severidad, origen, estado,
  fecha_apertura, fecha_limite_cierre,
  procesos:procesos!no_conformidades_proceso_id_fkey (nombre)
`;

function mapLista(n: any): NCLista {
  return {
    id: n.id,
    codigo: n.codigo,
    titulo: n.titulo,
    tipo: n.tipo,
    severidad: n.severidad,
    origen: n.origen,
    estado: n.estado,
    fechaApertura: n.fecha_apertura,
    fechaLimiteCierre: n.fecha_limite_cierre,
    procesoNombre: n.procesos?.nombre ?? null,
  };
}

export async function obtenerNCs(): Promise<NCLista[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("no_conformidades")
    .select(SELECT_LISTA)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("fecha_apertura", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las no conformidades: ${error.message}`);
  return ((data ?? []) as any[]).map(mapLista);
}

/**
 * No conformidades de un proceso, ordenadas por apertura (más recientes primero).
 * Mismo criterio de visibilidad que obtenerNCs (activas, no eliminadas).
 */
export async function listarNCsPorProceso(procesoId: string): Promise<NCLista[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("no_conformidades")
    .select(SELECT_LISTA)
    .eq("activo", true)
    .is("eliminado_en", null)
    .eq("proceso_id", procesoId)
    .order("fecha_apertura", { ascending: false });

  if (error)
    throw new Error(`No se pudieron cargar las no conformidades del proceso: ${error.message}`);
  return ((data ?? []) as any[]).map(mapLista);
}

export async function obtenerNCDetalle(id: string): Promise<NCDetalle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("no_conformidades")
    .select(
      `${SELECT_LISTA}, descripcion, origen_descripcion, analisis_causa_raiz,
       metodo_analisis, requiere_accion_inmediata, accion_inmediata_descripcion,
       hallazgos:hallazgos!no_conformidades_hallazgo_id_fkey (codigo)`,
    )
    .eq("id", id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !data) return null;
  const n = data as any;
  return {
    ...mapLista(n),
    descripcion: n.descripcion,
    origenDescripcion: n.origen_descripcion,
    analisisCausaRaiz: n.analisis_causa_raiz,
    metodoAnalisis: n.metodo_analisis,
    requiereAccionInmediata: n.requiere_accion_inmediata,
    accionInmediataDescripcion: n.accion_inmediata_descripcion,
    hallazgoCodigo: n.hallazgos?.codigo ?? null,
  };
}

export async function generarCodigoNC(): Promise<string> {
  const supabase = createClient();
  const anio = new Date().getFullYear();
  const prefijo = `NC-${anio}-`;
  const { data } = await supabase
    .from("no_conformidades")
    .select("codigo")
    .like("codigo", `${prefijo}%`)
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle();

  let proximo = 1;
  if (data?.codigo) {
    const num = parseInt((data.codigo as string).split("-")[2] ?? "0", 10);
    if (!Number.isNaN(num)) proximo = num + 1;
  }
  return `${prefijo}${String(proximo).padStart(3, "0")}`;
}

/** Hallazgos de tipo NC (mayor/menor) que aún no tienen una NC asociada. */
export async function obtenerHallazgosSinNC(): Promise<
  Array<{ id: string; codigo: string; titulo: string; tipo: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hallazgos")
    .select("id, codigo, titulo, tipo, no_conformidad_id")
    .in("tipo", ["no_conformidad_mayor", "no_conformidad_menor"])
    .is("no_conformidad_id", null)
    .eq("activo", true)
    .is("eliminado_en", null);

  if (error) return [];
  return ((data ?? []) as any[]).map((h) => ({
    id: h.id,
    codigo: h.codigo,
    titulo: h.titulo,
    tipo: h.tipo,
  }));
}
