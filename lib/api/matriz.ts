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
