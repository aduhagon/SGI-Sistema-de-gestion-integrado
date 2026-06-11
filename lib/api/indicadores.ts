import { createClient } from "@/lib/supabase/server";
import { evaluarCumplimiento, type CumplimientoEstado } from "@/lib/indicadores-utils";

export type { CumplimientoEstado };
export { evaluarCumplimiento };

export type Indicador = {
  id: string;
  codigo: string;
  procesoId: string;
  procesoNombre: string;
  nombre: string;
  descripcion: string | null;
  formula: string | null;
  unidad: string | null;
  meta: number | null;
  metaMinima: number | null;
  metaMaxima: number | null;
  sentido: string;
  periodicidad: string;
  responsablePuestoId: string | null;
  responsablePuestoNombre: string | null;
  // Derivados de la última medición:
  ultimoValor: number | null;
  ultimoPeriodo: string | null;
  cumplimiento: CumplimientoEstado;
  cantidadMediciones: number;
};

export async function listarIndicadores(procesoId?: string): Promise<Indicador[]> {
  const supabase = createClient();
  let query = supabase
    .from("indicadores")
    .select(
      `id, codigo, proceso_id, nombre, descripcion, formula, unidad, meta, meta_minima, meta_maxima,
       sentido, periodicidad, responsable_puesto_id,
       proceso:procesos!indicadores_proceso_id_fkey (nombre),
       responsable:puestos!indicadores_responsable_puesto_id_fkey (nombre)`,
    )
    .eq("activo", true)
    .is("eliminado_en", null);
  if (procesoId) query = query.eq("proceso_id", procesoId);

  const { data, error } = await query.order("codigo", { ascending: true });
  if (error) return [];

  const indicadores = (data ?? []) as any[];
  const ids = indicadores.map((i) => i.id);

  // Traer todas las mediciones de estos indicadores para derivar la última.
  const ultimaPorIndicador = new Map<string, { valor: number; periodo: string }>();
  const conteoPorIndicador = new Map<string, number>();
  if (ids.length > 0) {
    const { data: meds } = await supabase
      .from("mediciones_indicador")
      .select("indicador_id, periodo, valor")
      .in("indicador_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null)
      .order("periodo", { ascending: false });
    for (const m of (meds ?? []) as any[]) {
      conteoPorIndicador.set(m.indicador_id, (conteoPorIndicador.get(m.indicador_id) ?? 0) + 1);
      if (!ultimaPorIndicador.has(m.indicador_id)) {
        ultimaPorIndicador.set(m.indicador_id, { valor: Number(m.valor), periodo: m.periodo });
      }
    }
  }

  return indicadores.map((i) => {
    const ultima = ultimaPorIndicador.get(i.id);
    const cumplimiento: CumplimientoEstado = ultima
      ? evaluarCumplimiento(ultima.valor, i.sentido, i.meta, i.meta_minima, i.meta_maxima)
      : "sin_meta";
    return {
      id: i.id,
      codigo: i.codigo,
      procesoId: i.proceso_id,
      procesoNombre: i.proceso?.nombre ?? "—",
      nombre: i.nombre,
      descripcion: i.descripcion,
      formula: i.formula,
      unidad: i.unidad,
      meta: i.meta !== null ? Number(i.meta) : null,
      metaMinima: i.meta_minima !== null ? Number(i.meta_minima) : null,
      metaMaxima: i.meta_maxima !== null ? Number(i.meta_maxima) : null,
      sentido: i.sentido,
      periodicidad: i.periodicidad,
      responsablePuestoId: i.responsable_puesto_id,
      responsablePuestoNombre: i.responsable?.nombre ?? null,
      ultimoValor: ultima?.valor ?? null,
      ultimoPeriodo: ultima?.periodo ?? null,
      cumplimiento,
      cantidadMediciones: conteoPorIndicador.get(i.id) ?? 0,
    };
  });
}

export type Medicion = {
  id: string;
  periodo: string;
  valor: number;
  comentario: string | null;
  cumplimiento: CumplimientoEstado;
};

export async function obtenerIndicador(id: string): Promise<Indicador | null> {
  const todos = await listarIndicadores();
  return todos.find((i) => i.id === id) ?? null;
}

export async function listarMediciones(indicadorId: string): Promise<Medicion[]> {
  const supabase = createClient();
  // Traer el indicador para conocer su meta y sentido.
  const { data: ind } = await supabase
    .from("indicadores")
    .select("sentido, meta, meta_minima, meta_maxima")
    .eq("id", indicadorId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("mediciones_indicador")
    .select("id, periodo, valor, comentario")
    .eq("indicador_id", indicadorId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("periodo", { ascending: false });
  if (error) return [];

  return ((data ?? []) as any[]).map((m) => ({
    id: m.id,
    periodo: m.periodo,
    valor: Number(m.valor),
    comentario: m.comentario,
    cumplimiento: ind
      ? evaluarCumplimiento(Number(m.valor), (ind as any).sentido, (ind as any).meta, (ind as any).meta_minima, (ind as any).meta_maxima)
      : "sin_meta",
  }));
}

export type ProcesoOpcion = { id: string; nombre: string };
export type PuestoOpcion = { id: string; nombre: string };

export async function obtenerDatosFormIndicador(): Promise<{ procesos: ProcesoOpcion[]; puestos: PuestoOpcion[] }> {
  const supabase = createClient();
  const [procRes, puestoRes] = await Promise.all([
    supabase.from("procesos").select("id, nombre").eq("activo", true).is("eliminado_en", null).order("nombre"),
    supabase.from("puestos").select("id, nombre").eq("activo", true).is("eliminado_en", null).order("nombre"),
  ]);
  return {
    procesos: ((procRes.data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre })),
    puestos: ((puestoRes.data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre })),
  };
}
