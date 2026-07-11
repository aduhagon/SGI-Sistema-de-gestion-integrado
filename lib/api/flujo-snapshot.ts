import { createClient } from "@/lib/supabase/server";

// Snapshot congelado de un flujograma, tal como se publicó en una versión del documento.
export type SnapshotNodo = {
  id: string;
  nivel: "proceso" | "subproceso" | "paso";
  padre_id: string | null;
  codigo: string | null;
  titulo: string;
  tipo_bpmn: "inicio" | "tarea" | "decision" | "fin" | null;
  puesto_id: string | null;
  orden: number;
};

export type SnapshotArista = {
  id: string;
  origen_id: string;
  destino_id: string;
  tipo: string;
  etiqueta: string | null;
};

export type FlujoDeDocumento = {
  numeroVersion: string;
  flujoNodoId: string;
  nodos: SnapshotNodo[];
  aristas: SnapshotArista[];
  puestos: { id: string; nombre: string }[];
  congeladoEn: string | null;
};

// Devuelve el flujograma congelado asociado a un documento (Ficha de Proceso), si lo hay.
// Si se pasa versionId, trae el de esa versión; si no, el de la versión más reciente.
export async function obtenerFlujoDeDocumento(
  documentoId: string, versionId?: string | null
): Promise<FlujoDeDocumento | null> {
  const sb = createClient();

  let q = sb.from("flujo_version")
    .select("numero_version,snapshot,proceso_flujo_id,version_documento_id,creado_en")
    .eq("documento_id", documentoId)
    .eq("activo", true);
  if (versionId) q = q.eq("version_documento_id", versionId);
  const { data, error } = await q.order("numero_orden", { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return null;

  const fv = data[0] as {
    numero_version: string;
    snapshot: { nodos?: SnapshotNodo[]; aristas?: SnapshotArista[]; congelado_en?: string };
    proceso_flujo_id: string;
  };
  const nodos = fv.snapshot?.nodos ?? [];
  const aristas = fv.snapshot?.aristas ?? [];

  // Resolver los nombres de los puestos referenciados en el snapshot
  const puestoIds = Array.from(new Set(nodos.map((n) => n.puesto_id).filter(Boolean))) as string[];
  let puestos: { id: string; nombre: string }[] = [];
  if (puestoIds.length > 0) {
    const { data: ps } = await sb.from("puestos").select("id,nombre").in("id", puestoIds);
    puestos = (ps ?? []) as { id: string; nombre: string }[];
  }

  return {
    numeroVersion: fv.numero_version,
    flujoNodoId: fv.proceso_flujo_id,
    nodos,
    aristas,
    puestos,
    congeladoEn: fv.snapshot?.congelado_en ?? null,
  };
}
