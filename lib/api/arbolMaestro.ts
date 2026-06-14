import { createClient } from "@/lib/supabase/server";

/**
 * Listado maestro jerárquico: documentos agrupados por proceso y anidados por
 * relación padre-hijo (documento_padre_id).
 *
 * Estructura: Proceso → documentos raíz (sin padre) → hijos → nietos...
 */

export type DocNodo = {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  tipoCodigo: string | null;
  tipoColor: string | null;
  hijos: DocNodo[];
};

export type ProcesoMaestro = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  colorHex: string | null;
  documentos: DocNodo[]; // documentos raíz del proceso (sus hijos cuelgan dentro)
  totalDocumentos: number;
};

export type DocSinProceso = {
  documentos: DocNodo[];
  total: number;
};

export type ArbolMaestro = {
  procesos: ProcesoMaestro[];
  sinProceso: DocNodo[]; // documentos sin proceso asignado
};

type FilaDoc = {
  id: string;
  codigo: string;
  titulo: string;
  estado_actual: string;
  proceso_principal_id: string | null;
  documento_padre_id: string | null;
  tipo: { codigo: string; color_hex: string | null } | null;
};

type FilaProc = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  color_hex: string | null;
};

export async function obtenerArbolMaestro(): Promise<ArbolMaestro> {
  const supabase = createClient();

  const [{ data: docsRaw }, { data: procsRaw }] = await Promise.all([
    supabase
      .from("documentos")
      .select(
        `id, codigo, titulo, estado_actual, proceso_principal_id, documento_padre_id,
         tipo:tipos_documentales (codigo, color_hex)`,
      )
      .is("eliminado_en", null)
      .order("codigo", { ascending: true }),
    supabase
      .from("procesos")
      .select("id, codigo, nombre, tipo, color_hex")
      .is("eliminado_en", null)
      .order("codigo", { ascending: true }),
  ]);

  const docs = (docsRaw as unknown as FilaDoc[]) ?? [];
  const procs = (procsRaw as unknown as FilaProc[]) ?? [];

  // Crear nodos por id, con hijos vacíos.
  const nodos = new Map<string, DocNodo>();
  for (const d of docs) {
    nodos.set(d.id, {
      id: d.id,
      codigo: d.codigo,
      titulo: d.titulo,
      estado: d.estado_actual,
      tipoCodigo: d.tipo?.codigo ?? null,
      tipoColor: d.tipo?.color_hex ?? null,
      hijos: [],
    });
  }

  // Enlazar hijos a sus padres. Raíces = sin padre (o cuyo padre no existe).
  const raicesPorDoc: FilaDoc[] = [];
  for (const d of docs) {
    if (d.documento_padre_id && nodos.has(d.documento_padre_id)) {
      nodos.get(d.documento_padre_id)!.hijos.push(nodos.get(d.id)!);
    } else {
      raicesPorDoc.push(d);
    }
  }

  // Contar todos los documentos (incluidos hijos) bajo un nodo.
  function contar(nodo: DocNodo): number {
    return 1 + nodo.hijos.reduce((acc, h) => acc + contar(h), 0);
  }

  // Agrupar raíces por proceso.
  const procMap = new Map<string, ProcesoMaestro>();
  for (const p of procs) {
    procMap.set(p.id, {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      colorHex: p.color_hex,
      documentos: [],
      totalDocumentos: 0,
    });
  }

  const sinProceso: DocNodo[] = [];
  for (const d of raicesPorDoc) {
    const nodo = nodos.get(d.id)!;
    if (d.proceso_principal_id && procMap.has(d.proceso_principal_id)) {
      procMap.get(d.proceso_principal_id)!.documentos.push(nodo);
    } else {
      sinProceso.push(nodo);
    }
  }

  // Calcular totales por proceso (sumando jerarquía completa).
  const procesos: ProcesoMaestro[] = [];
  for (const pm of procMap.values()) {
    pm.totalDocumentos = pm.documentos.reduce((acc, n) => acc + contar(n), 0);
    // Solo incluir procesos que tengan documentos.
    if (pm.documentos.length > 0) procesos.push(pm);
  }

  return { procesos, sinProceso };
}
