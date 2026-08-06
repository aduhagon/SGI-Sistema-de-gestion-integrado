import { createClient } from "@/lib/supabase/server";

/**
 * Lecturas del módulo de referencias normativas a nivel fragmento.
 *
 * Los fragmentos son los bloques de texto extraídos de la versión vigente de
 * cada documento (tabla version_fragmentos, migración 056). Las referencias
 * cruzan un fragmento con un requisito normativo (referencias_normativas).
 * Todas las consultas corren con la sesión del usuario: la RLS aplica.
 */

export type FragmentoDeDocumento = {
  id: string;
  orden: number;
  tipo: string;
  numeral: string | null;
  nivel: number | null;
  titulo: string | null;
  texto: string;
  pagina: number | null;
  referencias: ReferenciaDeFragmento[];
};

export type ReferenciaDeFragmento = {
  id: string;
  tipo: "cita_norma" | "implementa" | "remite";
  estado: string;
  requisitoId: string;
  clausula: string;
  requisitoTitulo: string;
  normaCodigo: string;
};

/** Fragmentos de la versión vigente de un documento, con sus referencias. */
export async function obtenerFragmentosDeDocumento(
  documentoId: string,
): Promise<FragmentoDeDocumento[]> {
  const supabase = createClient();

  const { data: version } = await supabase
    .from("versiones")
    .select("id")
    .eq("documento_id", documentoId)
    .eq("es_vigente", true)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!version) return [];

  const { data, error } = await supabase
    .from("version_fragmentos")
    .select(
      `id, orden, tipo, numeral, nivel, titulo, texto, pagina,
       referencias_normativas (
         id, tipo, estado, eliminado_en,
         requisitos:requisitos!referencias_normativas_requisito_id_fkey (
           id, clausula, titulo,
           versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
             normas:normas!versiones_norma_norma_id_fkey (codigo)
           )
         )
       )`,
    )
    .eq("version_id", version.id)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden");

  if (error) {
    throw new Error(`No se pudieron cargar los fragmentos: ${error.message}`);
  }

  type FilaReferencia = {
    id: string;
    tipo: string;
    estado: string;
    eliminado_en: string | null;
    requisitos: {
      id: string;
      clausula: string;
      titulo: string;
      versiones_norma: { normas: { codigo: string } | null } | null;
    } | null;
  };

  type Fila = {
    id: string;
    orden: number;
    tipo: string;
    numeral: string | null;
    nivel: number | null;
    titulo: string | null;
    texto: string;
    pagina: number | null;
    referencias_normativas: FilaReferencia[] | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    orden: f.orden,
    tipo: f.tipo,
    numeral: f.numeral,
    nivel: f.nivel,
    titulo: f.titulo,
    texto: f.texto,
    pagina: f.pagina,
    referencias: (f.referencias_normativas ?? [])
      .filter((r) => !r.eliminado_en && r.estado === "aceptado" && r.requisitos)
      .map((r) => ({
        id: r.id,
        tipo: r.tipo as ReferenciaDeFragmento["tipo"],
        estado: r.estado,
        requisitoId: r.requisitos!.id,
        clausula: r.requisitos!.clausula,
        requisitoTitulo: r.requisitos!.titulo,
        normaCodigo: r.requisitos!.versiones_norma?.normas?.codigo ?? "",
      })),
  }));
}

export type ResultadoBusquedaFragmento = {
  fragmentoId: string;
  documentoId: string;
  documentoCodigo: string;
  documentoTitulo: string;
  numeral: string | null;
  titulo: string | null;
  pagina: number | null;
  /** HTML seguro generado por ts_headline: solo texto + <mark>. */
  extracto: string;
  referenciasAceptadas: number;
};

/** Búsqueda full-text sobre los fragmentos de versiones vigentes. */
export async function buscarFragmentos(
  consulta: string,
  versionNormaId?: string,
  tipoDocumentalId?: string,
): Promise<ResultadoBusquedaFragmento[]> {
  const q = consulta.trim();
  if (q.length < 2) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_buscar_fragmentos", {
    p_query: q,
    p_version_norma_id: versionNormaId ?? null,
    p_tipo_documental_id: tipoDocumentalId ?? null,
    p_limite: 25,
  });

  if (error) {
    throw new Error(`La búsqueda falló: ${error.message}`);
  }

  type Fila = {
    fragmento_id: string;
    documento_id: string;
    documento_codigo: string;
    documento_titulo: string;
    numeral: string | null;
    titulo: string | null;
    pagina: number | null;
    extracto: string;
    referencias_aceptadas: number;
  };

  return ((data ?? []) as Fila[]).map((f) => ({
    fragmentoId: f.fragmento_id,
    documentoId: f.documento_id,
    documentoCodigo: f.documento_codigo,
    documentoTitulo: f.documento_titulo,
    numeral: f.numeral,
    titulo: f.titulo,
    pagina: f.pagina,
    extracto: f.extracto,
    referenciasAceptadas: Number(f.referencias_aceptadas ?? 0),
  }));
}

export type FragmentoPorRequisito = {
  referenciaId: string;
  documentoId: string;
  documentoCodigo: string;
  documentoTitulo: string;
  numeral: string | null;
  fragmentoTitulo: string | null;
  pagina: number | null;
  tipo: string;
  citaLiteral: string | null;
  extracto: string;
};

/** Vista inversa: dónde se menciona / implementa un requisito. */
export async function obtenerFragmentosPorRequisito(
  requisitoId: string,
): Promise<FragmentoPorRequisito[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_fragmentos_por_requisito", {
    p_requisito_id: requisitoId,
  });

  if (error) {
    throw new Error(`No se pudo cargar la vista por requisito: ${error.message}`);
  }

  type Fila = {
    referencia_id: string;
    documento_id: string;
    documento_codigo: string;
    documento_titulo: string;
    numeral: string | null;
    fragmento_titulo: string | null;
    pagina: number | null;
    tipo: string;
    cita_literal: string | null;
    extracto: string;
  };

  return ((data ?? []) as Fila[]).map((f) => ({
    referenciaId: f.referencia_id,
    documentoId: f.documento_id,
    documentoCodigo: f.documento_codigo,
    documentoTitulo: f.documento_titulo,
    numeral: f.numeral,
    fragmentoTitulo: f.fragmento_titulo,
    pagina: f.pagina,
    tipo: f.tipo,
    citaLiteral: f.cita_literal,
    extracto: f.extracto,
  }));
}
