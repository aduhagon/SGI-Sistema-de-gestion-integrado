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
    .select("id,nivel,padre_id,codigo,titulo,descripcion,tipo_bpmn,marcador,puesto_id,proceso_id,orden,normativa,cod_riesgo,subtipo_evento")
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
    subtipoEvento: (r.subtipo_evento as import("@/lib/api/flujogramas-tipos").SubtipoEvento) ?? "ninguno",
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

// Documentos del maestro para vincular data objects.
// Incluye el/los proceso(s) SGI a los que pertenece cada documento, para que el
// front ordene "los del proceso primero, el resto del maestro debajo".
export type DocumentoRef = { id: string; codigo: string; titulo: string; procesoIds: string[] };

export async function listarDocumentosRef(): Promise<DocumentoRef[]> {
  const sb = createClient();
  const [{ data: docs, error }, { data: secundarios }] = await Promise.all([
    sb.from("documentos").select("id,codigo,titulo,proceso_principal_id").order("codigo", { ascending: true }),
    sb.from("documento_proceso_secundario").select("documento_id,proceso_id").eq("activo", true),
  ]);
  if (error) return [];
  // agrupar procesos secundarios por documento
  const secPorDoc = new Map<string, string[]>();
  for (const s of (secundarios ?? []) as { documento_id: string; proceso_id: string }[]) {
    const arr = secPorDoc.get(s.documento_id) ?? [];
    arr.push(s.proceso_id);
    secPorDoc.set(s.documento_id, arr);
  }
  return (docs ?? []).map((r: { id: string; codigo: string | null; titulo: string | null; proceso_principal_id: string | null }) => {
    const ids: string[] = [];
    if (r.proceso_principal_id) ids.push(r.proceso_principal_id);
    ids.push(...(secPorDoc.get(r.id) ?? []));
    return { id: r.id, codigo: r.codigo ?? "", titulo: r.titulo ?? "", procesoIds: ids };
  });
}
