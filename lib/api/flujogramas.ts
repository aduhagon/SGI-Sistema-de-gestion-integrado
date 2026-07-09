import { createClient } from "@/lib/supabase/server";

// ── Tipos ──
export type NivelFlujo = "proceso" | "subproceso" | "paso";
export type TipoBpmn = "inicio" | "tarea" | "decision" | "fin" | "subproceso_ref";
export type Marcador = "user" | "service" | "manual" | "sin_marcador";
export type EstadoGap = "rojo" | "amarillo" | "verde" | "sindatos";

export type NodoFlujo = {
  id: string;
  nivel: NivelFlujo;
  padreId: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  tipoBpmn: TipoBpmn | null;
  marcador: Marcador;
  puestoId: string | null;
  procesoId: string | null;
  orden: number;
  normativa: string | null;
  codRiesgo: string | null;
};

export type AristaFlujo = {
  id: string;
  origenId: string;
  destinoId: string;
  tipo: "secuencia" | "rama";
  etiqueta: string | null;
};

export type DataObject = {
  id: string;
  nodoId: string;
  direccion: "entrada" | "salida";
  etiqueta: string;
  documentoId: string | null;
};

export type PuestoRef = { id: string; codigo: string; nombre: string };

export type GapSubproceso = {
  procesoId: string;
  proceso: string;
  subprocesoId: string;
  subproceso: string;
  riesgos: number;
  controles: number;
  pasos: number;
  estado: EstadoGap;
  etiqueta: string;
};

// Salud a partir de riesgos/controles (misma regla que el diseño DOC-SGI-DIS-001)
function calcularEstado(riesgos: number, controles: number): { estado: EstadoGap; etiqueta: string } {
  if (riesgos > 0 && controles === 0) return { estado: "rojo", etiqueta: "Riesgo sin control" };
  if (riesgos > 0 && riesgos > controles * 2) return { estado: "amarillo", etiqueta: "Cobertura floja" };
  if (riesgos === 0 && controles === 0) return { estado: "sindatos", etiqueta: "Sin datos de riesgo" };
  return { estado: "verde", etiqueta: "Cobertura ok" };
}

// Peor hijo gana (para agregar al proceso)
export function agregarEstado(estados: EstadoGap[]): EstadoGap {
  if (estados.includes("rojo")) return "rojo";
  if (estados.includes("amarillo")) return "amarillo";
  if (estados.includes("verde")) return "verde";
  return "sindatos";
}

const map = <T,>(rows: unknown[], fn: (r: Record<string, unknown>) => T): T[] =>
  (rows ?? []).map((r) => fn(r as Record<string, unknown>));

export async function listarNodos(): Promise<NodoFlujo[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("flujo_nodo")
    .select("id,nivel,padre_id,codigo,titulo,descripcion,tipo_bpmn,marcador,puesto_id,proceso_id,orden,normativa,cod_riesgo")
    .eq("activo", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return map(data, (r) => ({
    id: r.id as string,
    nivel: r.nivel as NivelFlujo,
    padreId: (r.padre_id as string) ?? null,
    codigo: (r.codigo as string) ?? null,
    titulo: r.titulo as string,
    descripcion: (r.descripcion as string) ?? null,
    tipoBpmn: (r.tipo_bpmn as TipoBpmn) ?? null,
    marcador: (r.marcador as Marcador) ?? "sin_marcador",
    puestoId: (r.puesto_id as string) ?? null,
    procesoId: (r.proceso_id as string) ?? null,
    orden: (r.orden as number) ?? 0,
    normativa: (r.normativa as string) ?? null,
    codRiesgo: (r.cod_riesgo as string) ?? null,
  }));
}

export async function listarAristas(): Promise<AristaFlujo[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("flujo_arista")
    .select("id,origen_id,destino_id,tipo,etiqueta");
  if (error) throw error;
  return map(data, (r) => ({
    id: r.id as string,
    origenId: r.origen_id as string,
    destinoId: r.destino_id as string,
    tipo: r.tipo as "secuencia" | "rama",
    etiqueta: (r.etiqueta as string) ?? null,
  }));
}

export async function listarDataObjects(): Promise<DataObject[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("flujo_data_object")
    .select("id,nodo_id,direccion,etiqueta,documento_id");
  if (error) throw error;
  return map(data, (r) => ({
    id: r.id as string,
    nodoId: r.nodo_id as string,
    direccion: r.direccion as "entrada" | "salida",
    etiqueta: r.etiqueta as string,
    documentoId: (r.documento_id as string) ?? null,
  }));
}

export async function listarPuestos(): Promise<PuestoRef[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("puestos")
    .select("id,codigo,nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return map(data, (r) => ({ id: r.id as string, codigo: r.codigo as string, nombre: r.nombre as string }));
}

// Detección de gaps por subproceso (resuelto en memoria desde los nodos ya cargados)
export function calcularGaps(nodos: NodoFlujo[]): GapSubproceso[] {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const subs = nodos.filter((n) => n.nivel === "subproceso");
  const pasos = nodos.filter((n) => n.nivel === "paso");
  const out: GapSubproceso[] = [];
  for (const sp of subs) {
    const proc = sp.padreId ? porId.get(sp.padreId) : undefined;
    const hijos = pasos.filter((p) => p.padreId === sp.id);
    const riesgos = hijos.filter((p) => p.codRiesgo && p.codRiesgo.trim() !== "").length;
    const controles = hijos.filter((p) => p.tipoBpmn === "decision").length;
    const { estado, etiqueta } = calcularEstado(riesgos, controles);
    out.push({
      procesoId: proc?.id ?? "",
      proceso: proc?.titulo ?? "—",
      subprocesoId: sp.id,
      subproceso: sp.titulo,
      riesgos,
      controles,
      pasos: hijos.length,
      estado,
      etiqueta,
    });
  }
  // rojo primero, luego por riesgos desc
  return out.sort((a, b) => {
    const rank = (e: EstadoGap) => (e === "rojo" ? 0 : e === "amarillo" ? 1 : e === "verde" ? 2 : 3);
    return rank(a.estado) - rank(b.estado) || b.riesgos - a.riesgos;
  });
}
