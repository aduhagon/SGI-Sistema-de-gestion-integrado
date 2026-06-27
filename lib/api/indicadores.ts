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

// ── Árbol de indicadores por proceso ────────────────────────────────────────
// Reusa listarIndicadores() y agrupa en memoria por proceso (mismo patrón que
// el árbol de riesgos). No hay función SQL ni migración: el proceso_padre_id se
// trae aparte para anidar.

export type IndicadorArbol = {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string | null;
  meta: number | null;
  sentido: string;
  periodicidad: string;
  ultimoValor: number | null;
  ultimoPeriodo: string | null;
  cumplimiento: CumplimientoEstado;
  cantidadMediciones: number;
  responsablePuestoNombre: string | null;
};

export type NodoProcesoIndicador = {
  procesoId: string;
  codigo: string;
  nombre: string;
  procesoPadreId: string | null;
  total: number;          // indicadores del subárbol
  medidos: number;        // con al menos una medición
  // Peor cumplimiento entre los indicadores MEDIDOS del subárbol. null si ninguno medido.
  peorCumplimiento: CumplimientoEstado | null;
  indicadores: IndicadorArbol[];  // directos del proceso
  hijos: NodoProcesoIndicador[];
};

export async function obtenerArbolIndicadores(): Promise<NodoProcesoIndicador[]> {
  const supabase = createClient();

  // 1. Todos los indicadores (con cumplimiento ya calculado) + jerarquía de procesos.
  const [indicadores, procRes] = await Promise.all([
    listarIndicadores(),
    supabase
      .from("procesos")
      .select("id, codigo, nombre, proceso_padre_id, orden_visualizacion")
      .eq("activo", true)
      .is("eliminado_en", null)
      .order("orden_visualizacion", { ascending: true }),
  ]);

  const procesos = (procRes.data ?? []) as any[];

  // 2. Indicadores directos por proceso.
  const directosPorProc = new Map<string, IndicadorArbol[]>();
  for (const i of indicadores) {
    const arr = directosPorProc.get(i.procesoId) ?? [];
    arr.push({
      id: i.id,
      codigo: i.codigo,
      nombre: i.nombre,
      unidad: i.unidad,
      meta: i.meta,
      sentido: i.sentido,
      periodicidad: i.periodicidad,
      ultimoValor: i.ultimoValor,
      ultimoPeriodo: i.ultimoPeriodo,
      cumplimiento: i.cumplimiento,
      cantidadMediciones: i.cantidadMediciones,
      responsablePuestoNombre: i.responsablePuestoNombre,
    });
    directosPorProc.set(i.procesoId, arr);
  }

  // 3. Construir nodos (sin agregados de subárbol todavía).
  const porId = new Map<string, NodoProcesoIndicador>();
  for (const p of procesos) {
    const directos = directosPorProc.get(p.id) ?? [];
    porId.set(p.id, {
      procesoId: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      procesoPadreId: p.proceso_padre_id,
      total: 0,
      medidos: 0,
      peorCumplimiento: null,
      indicadores: directos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
      hijos: [],
    });
  }

  // 4. Enganchar hijos y juntar raíces.
  const raices: NodoProcesoIndicador[] = [];
  for (const nodo of porId.values()) {
    if (nodo.procesoPadreId && porId.has(nodo.procesoPadreId)) {
      porId.get(nodo.procesoPadreId)!.hijos.push(nodo);
    } else {
      raices.push(nodo);
    }
  }

  // 5. Agregar de abajo hacia arriba: total, medidos y peor cumplimiento del subárbol.
  // Severidad de cumplimiento (mayor = peor) para quedarnos con el peor.
  const rank: Record<CumplimientoEstado, number> = {
    cumple: 1, alerta: 2, incumple: 3, sin_meta: 0,
  };

  function agregar(nodo: NodoProcesoIndicador): { total: number; medidos: number; peor: CumplimientoEstado | null } {
    let total = 0;
    let medidos = 0;
    let peor: CumplimientoEstado | null = null;

    const considerar = (c: CumplimientoEstado) => {
      // Solo cuenta para el semáforo si es un cumplimiento real (no sin_meta).
      if (c === "sin_meta") return;
      if (peor === null || rank[c] > rank[peor]) peor = c;
    };

    for (const ind of nodo.indicadores) {
      total += 1;
      if (ind.cantidadMediciones > 0) {
        medidos += 1;
        considerar(ind.cumplimiento);
      }
    }
    for (const hijo of nodo.hijos) {
      const r = agregar(hijo);
      total += r.total;
      medidos += r.medidos;
      if (r.peor !== null) considerar(r.peor);
    }

    nodo.total = total;
    nodo.medidos = medidos;
    nodo.peorCumplimiento = peor;
    return { total, medidos, peor };
  }
  raices.forEach(agregar);

  // 6. Ordenar: procesos con más indicadores primero.
  const ordenar = (ns: NodoProcesoIndicador[]) => {
    ns.sort((a, b) => b.total - a.total || a.codigo.localeCompare(b.codigo));
    ns.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);

  return raices;
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
