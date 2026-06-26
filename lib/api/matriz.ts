import { createClient } from "@/lib/supabase/server";

export type CoberturaDeRequisito = {
  documentoId: string;
  codigo: string;
  titulo: string;
  tipoCobertura: "total" | "parcial" | "referencia";
  estadoDocumento: string;
};

export type RequisitoMatriz = {
  requisitoId: string;
  clausula: string;
  titulo: string;
  esCritico: boolean;
  coberturas: CoberturaDeRequisito[];
  cubierto: boolean;
};

export type NormaOpcion = {
  versionNormaId: string;
  codigo: string;
  nombreCorto: string;
  version: string;
};

export type MatrizCumplimiento = {
  norma: NormaOpcion;
  requisitos: RequisitoMatriz[];
  totalRequisitos: number;
  requisitosCubiertos: number;
  requisitosCriticosSinCobertura: number;
};

/** Normas que tienen al menos un requisito cargado (para el selector). */
export async function obtenerNormasConRequisitos(): Promise<NormaOpcion[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("versiones_norma")
    .select(
      `id, version,
       normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto),
       requisitos ( id )`,
    );

  if (error) throw new Error(`No se pudieron cargar las normas: ${error.message}`);

  type Fila = {
    id: string;
    version: string;
    normas: { codigo: string; nombre_corto: string } | null;
    requisitos: Array<{ id: string }> | null;
  };

  return ((data ?? []) as unknown as Fila[])
    .filter((vn) => (vn.requisitos?.length ?? 0) > 0)
    .map((vn) => ({
      versionNormaId: vn.id,
      codigo: vn.normas?.codigo ?? "—",
      nombreCorto: vn.normas?.nombre_corto ?? "—",
      version: vn.version,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

/** Matriz de cumplimiento para una versión de norma concreta. */
export async function obtenerMatriz(
  versionNormaId: string,
): Promise<MatrizCumplimiento | null> {
  const supabase = createClient();

  const { data: vn, error: errVn } = await supabase
    .from("versiones_norma")
    .select(
      `id, version, normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto)`,
    )
    .eq("id", versionNormaId)
    .maybeSingle();

  if (errVn || !vn) return null;

  const { data: reqs, error: errReq } = await supabase
    .from("requisitos")
    .select(
      `id, clausula, titulo, es_critico,
       coberturas (
         tipo_cobertura,
         activo,
         eliminado_en,
         documentos:documentos!coberturas_documento_id_fkey (
           id, codigo, titulo, estado_actual, eliminado_en
         )
       )`,
    )
    .eq("version_norma_id", versionNormaId)
    .eq("activo", true)
    .order("orden_dentro_padre", { ascending: true });

  if (errReq) throw new Error(`No se pudo cargar la matriz: ${errReq.message}`);

  type FilaReq = {
    id: string;
    clausula: string;
    titulo: string;
    es_critico: boolean;
    coberturas: Array<{
      tipo_cobertura: string;
      activo: boolean;
      eliminado_en: string | null;
      documentos: {
        id: string;
        codigo: string;
        titulo: string;
        estado_actual: string;
        eliminado_en: string | null;
      } | null;
    }> | null;
  };

  const filas = (reqs ?? []) as unknown as FilaReq[];

  // Ordenar por clausula de forma natural (4, 4.1, 4.2, 5, ...).
  const ordenarClausula = (a: string, b: string) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return 0;
  };

  const requisitos: RequisitoMatriz[] = filas
    .map((r) => {
      const coberturas: CoberturaDeRequisito[] = (r.coberturas ?? [])
        .filter((c) => c.activo && !c.eliminado_en && c.documentos && !c.documentos.eliminado_en)
        .map((c) => ({
          documentoId: c.documentos!.id,
          codigo: c.documentos!.codigo,
          titulo: c.documentos!.titulo,
          tipoCobertura: c.tipo_cobertura as "total" | "parcial" | "referencia",
          estadoDocumento: c.documentos!.estado_actual,
        }));

      return {
        requisitoId: r.id,
        clausula: r.clausula,
        titulo: r.titulo,
        esCritico: r.es_critico,
        coberturas,
        cubierto: coberturas.length > 0,
      };
    })
    .sort((a, b) => ordenarClausula(a.clausula, b.clausula));

  const requisitosCubiertos = requisitos.filter((r) => r.cubierto).length;
  const requisitosCriticosSinCobertura = requisitos.filter(
    (r) => r.esCritico && !r.cubierto,
  ).length;

  return {
    norma: {
      versionNormaId: vn.id,
      codigo: (vn as any).normas?.codigo ?? "—",
      nombreCorto: (vn as any).normas?.nombre_corto ?? "—",
      version: vn.version,
    },
    requisitos,
    totalRequisitos: requisitos.length,
    requisitosCubiertos,
    requisitosCriticosSinCobertura,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Panorama consolidado de todas las normas con requisitos: una fila por norma
// con su % de cobertura, requisitos cubiertos/totales y críticos sin cubrir.
// Usado por el tablero multinorma (/cumplimiento/panorama).
// Hace UNA sola consulta agregada (no N llamadas a obtenerMatriz).
// ─────────────────────────────────────────────────────────────────────────────

export type PanoramaNorma = {
  versionNormaId: string;
  codigo: string;
  nombreCorto: string;
  version: string;
  totalRequisitos: number;
  requisitosCubiertos: number;
  pctCobertura: number;
  criticosSinCubrir: number;
};

export async function obtenerPanoramaNormas(): Promise<PanoramaNorma[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requisitos")
    .select(
      `id, es_critico, version_norma_id,
       versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
         id, version,
         normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto)
       ),
       coberturas (
         activo, eliminado_en,
         documentos:documentos!coberturas_documento_id_fkey ( id, eliminado_en )
       )`,
    )
    .eq("activo", true);

  if (error) {
    throw new Error(`No se pudo cargar el panorama: ${error.message}`);
  }

  type Fila = {
    id: string;
    es_critico: boolean;
    version_norma_id: string;
    versiones_norma: {
      id: string;
      version: string;
      normas: { codigo: string; nombre_corto: string } | null;
    } | null;
    coberturas: Array<{
      activo: boolean;
      eliminado_en: string | null;
      documentos: { id: string; eliminado_en: string | null } | null;
    }> | null;
  };

  const filas = (data ?? []) as unknown as Fila[];

  const acc = new Map<
    string,
    {
      codigo: string;
      nombreCorto: string;
      version: string;
      total: number;
      cubiertos: number;
      criticosSinCubrir: number;
    }
  >();

  for (const r of filas) {
    const vn = r.versiones_norma;
    if (!vn) continue;

    const cubierto = (r.coberturas ?? []).some(
      (c) => c.activo && !c.eliminado_en && c.documentos && !c.documentos.eliminado_en,
    );

    const prev =
      acc.get(vn.id) ?? {
        codigo: vn.normas?.codigo ?? "—",
        nombreCorto: vn.normas?.nombre_corto ?? "—",
        version: vn.version,
        total: 0,
        cubiertos: 0,
        criticosSinCubrir: 0,
      };

    prev.total += 1;
    if (cubierto) prev.cubiertos += 1;
    if (r.es_critico && !cubierto) prev.criticosSinCubrir += 1;

    acc.set(vn.id, prev);
  }

  return Array.from(acc.entries())
    .map(([versionNormaId, v]) => ({
      versionNormaId,
      codigo: v.codigo,
      nombreCorto: v.nombreCorto,
      version: v.version,
      totalRequisitos: v.total,
      requisitosCubiertos: v.cubiertos,
      pctCobertura: v.total > 0 ? Math.round((v.cubiertos / v.total) * 100) : 0,
      criticosSinCubrir: v.criticosSinCubrir,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

// ─────────────────────────────────────────────────────────────────────────────
// Árbol de cumplimiento jerárquico para la vista de detalle de una norma.
// Usa la función SQL fn_cobertura_arbol, que calcula por cada nodo:
//   - es_hoja, score_hoja (mejor cobertura: total=1, parcial=0.5, resto=0)
//   - hojas_total / hojas_cubiertas (agregando descendientes)
//   - pct_cumplimiento (0..100): promedio simple de las hojas del subárbol.
// El padre nunca dobla-cuenta: una hoja con varias coberturas toma la mejor.
// Las coberturas concretas (qué documento cubre cada hoja) se traen aparte y
// se asocian por requisitoId, para poder linkear al documento desde la hoja.
// ─────────────────────────────────────────────────────────────────────────────

export type NodoCumplimiento = {
  requisitoId: string;
  clausula: string;
  titulo: string;
  nivel: number;
  esHoja: boolean;
  esCritico: boolean;
  pctCumplimiento: number; // 0..100
  hojasTotal: number;
  hojasCubiertas: number;
  coberturas: CoberturaDeRequisito[]; // solo poblado en hojas
  hijos: NodoCumplimiento[];
};

export type ArbolCumplimiento = {
  norma: NormaOpcion;
  raices: NodoCumplimiento[];
  totalHojas: number;
  hojasCubiertas: number;
  pctGlobal: number;
  criticosSinCubrir: number;
};

export async function obtenerArbolCumplimiento(
  versionNormaId: string,
): Promise<ArbolCumplimiento | null> {
  const supabase = createClient();

  // Datos de la norma (para el encabezado).
  const { data: vn, error: errVn } = await supabase
    .from("versiones_norma")
    .select(
      `id, version, normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto)`,
    )
    .eq("id", versionNormaId)
    .maybeSingle();

  if (errVn || !vn) return null;

  // 1) Árbol con scores y % desde la función SQL.
  const { data: filas, error: errArbol } = await supabase.rpc(
    "fn_cobertura_arbol",
    { p_version_norma_id: versionNormaId },
  );

  if (errArbol) {
    throw new Error(`No se pudo cargar el árbol de cumplimiento: ${errArbol.message}`);
  }

  type FilaArbol = {
    id: string;
    clausula: string;
    titulo: string;
    nivel_jerarquia: number;
    requisito_padre_id: string | null;
    es_hoja: boolean;
    score_hoja: number | null;
    hojas_total: number;
    hojas_cubiertas: number;
    pct_cumplimiento: number;
  };

  const arbol = (filas ?? []) as unknown as FilaArbol[];

  // 2) Coberturas (documentos) y flag de crítico por requisito, en una sola consulta.
  const { data: reqs, error: errReq } = await supabase
    .from("requisitos")
    .select(
      `id, es_critico,
       coberturas (
         tipo_cobertura, activo, eliminado_en,
         documentos:documentos!coberturas_documento_id_fkey (
           id, codigo, titulo, estado_actual, eliminado_en
         )
       )`,
    )
    .eq("version_norma_id", versionNormaId)
    .eq("activo", true);

  if (errReq) throw new Error(`No se pudieron cargar las coberturas: ${errReq.message}`);

  type FilaReq = {
    id: string;
    es_critico: boolean;
    coberturas: Array<{
      tipo_cobertura: string;
      activo: boolean;
      eliminado_en: string | null;
      documentos: {
        id: string;
        codigo: string;
        titulo: string;
        estado_actual: string;
        eliminado_en: string | null;
      } | null;
    }> | null;
  };

  const coberturasPorReq = new Map<string, CoberturaDeRequisito[]>();
  const criticoPorReq = new Map<string, boolean>();

  for (const r of (reqs ?? []) as unknown as FilaReq[]) {
    criticoPorReq.set(r.id, r.es_critico);
    const cobs = (r.coberturas ?? [])
      .filter(
        (c) =>
          c.activo && !c.eliminado_en && c.documentos && !c.documentos.eliminado_en,
      )
      .map((c) => ({
        documentoId: c.documentos!.id,
        codigo: c.documentos!.codigo,
        titulo: c.documentos!.titulo,
        tipoCobertura: c.tipo_cobertura as "total" | "parcial" | "referencia",
        estadoDocumento: c.documentos!.estado_actual,
      }));
    if (cobs.length > 0) coberturasPorReq.set(r.id, cobs);
  }

  // 3) Construir nodos planos y enlazarlos en árbol por requisito_padre_id.
  const nodos = new Map<string, NodoCumplimiento>();
  for (const f of arbol) {
    nodos.set(f.id, {
      requisitoId: f.id,
      clausula: f.clausula,
      titulo: f.titulo,
      nivel: f.nivel_jerarquia,
      esHoja: f.es_hoja,
      esCritico: criticoPorReq.get(f.id) ?? false,
      pctCumplimiento: Number(f.pct_cumplimiento),
      hojasTotal: f.hojas_total,
      hojasCubiertas: Number(f.hojas_cubiertas),
      coberturas: f.es_hoja ? coberturasPorReq.get(f.id) ?? [] : [],
      hijos: [],
    });
  }

  const raices: NodoCumplimiento[] = [];
  const ordenClausula = (a: NodoCumplimiento, b: NodoCumplimiento) => {
    const pa = a.clausula.split(".").map(Number);
    const pb = b.clausula.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return 0;
  };

  for (const f of arbol) {
    const nodo = nodos.get(f.id)!;
    if (f.requisito_padre_id && nodos.has(f.requisito_padre_id)) {
      nodos.get(f.requisito_padre_id)!.hijos.push(nodo);
    } else {
      raices.push(nodo);
    }
  }

  // Ordenar recursivamente.
  const ordenarRec = (lista: NodoCumplimiento[]) => {
    lista.sort(ordenClausula);
    lista.forEach((n) => ordenarRec(n.hijos));
  };
  ordenarRec(raices);

  // Totales globales: sumar hojas reales (no nodos padre).
  let totalHojas = 0;
  let hojasCubiertas = 0;
  let criticosSinCubrir = 0;
  for (const n of nodos.values()) {
    if (n.esHoja) {
      totalHojas += 1;
      hojasCubiertas += n.pctCumplimiento >= 100 ? 1 : n.pctCumplimiento > 0 ? 0.5 : 0;
      if (n.esCritico && n.pctCumplimiento === 0) criticosSinCubrir += 1;
    }
  }

  return {
    norma: {
      versionNormaId: vn.id,
      codigo: (vn as any).normas?.codigo ?? "—",
      nombreCorto: (vn as any).normas?.nombre_corto ?? "—",
      version: vn.version,
    },
    raices,
    totalHojas,
    hojasCubiertas,
    pctGlobal: totalHojas > 0 ? Math.round((hojasCubiertas / totalHojas) * 100) : 0,
    criticosSinCubrir,
  };
}
