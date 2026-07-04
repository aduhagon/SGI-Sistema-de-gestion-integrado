import { createClient } from "@/lib/supabase/server";

/**
 * Listado maestro jerárquico: documentos agrupados por proceso y anidados por
 * relación padre-hijo (documento_padre_id).
 *
 * Estructura: Proceso → documentos raíz (sin padre) → hijos → nietos...
 *
 * Incluye por documento: versión (vigente si existe, si no la última en curso),
 * normas asociadas (vía documento_norma → versiones_norma → normas) y fecha de
 * aprobación de la versión vigente, para filtros y exportación.
 */

export type DocNodo = {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  tipoCodigo: string | null;
  tipoColor: string | null;
  version: string | null;
  versionVigente: boolean;
  normas: string[]; // nombre corto de cada norma asociada (ej. "ISO 9001")
  fechaAprobado: string | null;
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
  version_vigente_id: string | null;
  tipo: { codigo: string; color_hex: string | null } | null;
};

type FilaProc = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  color_hex: string | null;
};

type FilaVersion = {
  id: string;
  documento_id: string;
  numero_version: string;
  numero_orden: number;
  fecha_aprobado: string | null;
};

type FilaDocNorma = {
  documento_id: string;
  version_norma: {
    norma: { nombre_corto: string; orden_visualizacion: number | null } | null;
  } | null;
};

export async function obtenerArbolMaestro(): Promise<ArbolMaestro> {
  const supabase = createClient();

  const [{ data: docsRaw }, { data: procsRaw }, { data: versRaw }, { data: normasRaw }] =
    await Promise.all([
      supabase
        .from("documentos")
        .select(
          `id, codigo, titulo, estado_actual, proceso_principal_id, documento_padre_id,
           version_vigente_id, tipo:tipos_documentales (codigo, color_hex)`,
        )
        .is("eliminado_en", null)
        .order("codigo", { ascending: true }),
      supabase
        .from("procesos")
        .select("id, codigo, nombre, tipo, color_hex")
        .is("eliminado_en", null)
        .order("codigo", { ascending: true }),
      supabase
        .from("versiones")
        .select("id, documento_id, numero_version, numero_orden, fecha_aprobado")
        .is("eliminado_en", null)
        .order("numero_orden", { ascending: false }),
      supabase
        .from("documento_norma")
        .select(
          `documento_id,
           version_norma:versiones_norma (norma:normas (nombre_corto, orden_visualizacion))`,
        )
        .is("eliminado_en", null),
    ]);

  const docs = (docsRaw as unknown as FilaDoc[]) ?? [];
  const procs = (procsRaw as unknown as FilaProc[]) ?? [];
  const versiones = (versRaw as unknown as FilaVersion[]) ?? [];
  const docNormas = (normasRaw as unknown as FilaDocNorma[]) ?? [];

  // Resolver en memoria: versión por id y última versión por documento
  // (versiones ya viene ordenada por numero_orden descendente).
  const versionPorId = new Map<string, FilaVersion>();
  const ultimaVersionPorDoc = new Map<string, FilaVersion>();
  for (const v of versiones) {
    versionPorId.set(v.id, v);
    if (!ultimaVersionPorDoc.has(v.documento_id)) {
      ultimaVersionPorDoc.set(v.documento_id, v);
    }
  }

  // Normas asociadas por documento (orden estable por orden_visualizacion).
  const normasPorDoc = new Map<string, { nombre: string; orden: number }[]>();
  for (const dn of docNormas) {
    const norma = dn.version_norma?.norma;
    if (!norma) continue;
    const lista = normasPorDoc.get(dn.documento_id) ?? [];
    if (!lista.some((n) => n.nombre === norma.nombre_corto)) {
      lista.push({ nombre: norma.nombre_corto, orden: norma.orden_visualizacion ?? 99 });
    }
    normasPorDoc.set(dn.documento_id, lista);
  }

  // Crear nodos por id, con hijos vacíos.
  const nodos = new Map<string, DocNodo>();
  for (const d of docs) {
    const vigente = d.version_vigente_id
      ? versionPorId.get(d.version_vigente_id) ?? null
      : null;
    const ultima = ultimaVersionPorDoc.get(d.id) ?? null;
    const ver = vigente ?? ultima;
    const normas = (normasPorDoc.get(d.id) ?? [])
      .sort((a, b) => a.orden - b.orden)
      .map((n) => n.nombre);

    nodos.set(d.id, {
      id: d.id,
      codigo: d.codigo,
      titulo: d.titulo,
      estado: d.estado_actual,
      tipoCodigo: d.tipo?.codigo ?? null,
      tipoColor: d.tipo?.color_hex ?? null,
      version: ver?.numero_version ?? null,
      versionVigente: vigente !== null,
      normas,
      fechaAprobado: vigente?.fecha_aprobado ?? null,
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
