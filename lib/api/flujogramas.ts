import { createClient } from "@/lib/supabase/server";
import type {
  NodoFlujo, AristaFlujo, DataObject, PuestoRef, NivelFlujo, TipoBpmn, Marcador,
} from "@/lib/api/flujogramas-tipos";

// Re-export de tipos y funciones puras para no romper imports existentes desde server components
export * from "@/lib/api/flujogramas-tipos";

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

// Documentos del maestro para vincular data objects (código + título)
export type DocumentoRef = { id: string; codigo: string; titulo: string };

export async function listarDocumentosRef(): Promise<DocumentoRef[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("documentos")
    .select("id,codigo,titulo")
    .order("codigo", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: { id: string; codigo: string | null; titulo: string | null }) => ({
    id: r.id,
    codigo: r.codigo ?? "",
    titulo: r.titulo ?? "",
  }));
}
