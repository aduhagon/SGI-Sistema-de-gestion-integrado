import { createClient } from "@/lib/supabase/server";

/**
 * Documento resumido para listados y vistas tabulares.
 */
export type DocumentSummary = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion_corta: string | null;
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  tipo: {
    codigo: string;
    nombre: string;
    color_hex: string | null;
    icono: string | null;
  } | null;
  proceso: {
    codigo: string;
    nombre: string;
    color_hex: string | null;
  } | null;
  normas: Array<{ codigo: string; nombre_corto: string }>;
};

type DocumentoRaw = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion_corta: string | null;
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  tipo: DocumentSummary["tipo"];
  proceso: DocumentSummary["proceso"];
  documento_norma: Array<{
    version_norma: {
      norma: { codigo: string; nombre_corto: string } | null;
    } | null;
  }> | null;
};

function normalizar(doc: DocumentoRaw): DocumentSummary {
  const normas =
    (doc.documento_norma ?? [])
      .map((dn) => dn.version_norma?.norma)
      .filter((n): n is { codigo: string; nombre_corto: string } => n !== null && n !== undefined);

  return {
    id: doc.id,
    codigo: doc.codigo,
    titulo: doc.titulo,
    descripcion_corta: doc.descripcion_corta,
    estado_actual: doc.estado_actual,
    criticidad: doc.criticidad,
    creado_en: doc.creado_en,
    actualizado_en: doc.actualizado_en,
    tipo: doc.tipo,
    proceso: doc.proceso,
    normas,
  };
}

const SELECT_DOCUMENTO = `
  id,
  codigo,
  titulo,
  descripcion_corta,
  estado_actual,
  criticidad,
  creado_en,
  actualizado_en,
  tipo:tipos_documentales (codigo, nombre, color_hex, icono),
  proceso:procesos!documentos_proceso_principal_id_fkey (codigo, nombre, color_hex),
  documento_norma (
    version_norma:versiones_norma (
      norma:normas (codigo, nombre_corto)
    )
  )
`;

export async function listarDocumentos(): Promise<DocumentSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documentos")
    .select(SELECT_DOCUMENTO)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error listando documentos:", error);
    return [];
  }

  return (data ?? []).map((d) => normalizar(d as unknown as DocumentoRaw));
}

export async function listarDocumentosPorProceso(
  procesoCodigo: string,
): Promise<DocumentSummary[]> {
  const supabase = createClient();

  const { data: proceso } = await supabase
    .from("procesos")
    .select("id")
    .eq("codigo", procesoCodigo.toUpperCase())
    .eq("activo", true)
    .maybeSingle();

  if (!proceso) return [];

  const { data, error } = await supabase
    .from("documentos")
    .select(SELECT_DOCUMENTO)
    .eq("proceso_principal_id", proceso.id)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false });

  if (error) return [];

  return (data ?? []).map((d) => normalizar(d as unknown as DocumentoRaw));
}

/**
 * Tipo documental con info adicional para el form de creación.
 */
export type TipoDocumentalForm = {
  id: string;
  codigo: string;
  nombre: string;
  nivel_jerarquico: number | null;
  puede_tener_padre: boolean;
};

/**
 * Datos necesarios para el form de creación de documento.
 * Ahora incluye país, info de jerarquía, y la posibilidad de listar padres.
 */
export async function obtenerDatosForm() {
  const supabase = createClient();

  const [{ data: tipos }, { data: procesos }, { data: normas }, { data: paises }] =
    await Promise.all([
      supabase
        .from("tipos_documentales")
        .select(
          "id, codigo, nombre, criticidad_default, confidencialidad_default, frecuencia_revision_default, requiere_acuse_lectura, nivel_jerarquico, puede_tener_padre",
        )
        .eq("activo", true)
        .order("orden_visualizacion"),
      supabase
        .from("procesos")
        .select("id, codigo, codigo_numerico, nombre, tipo")
        .eq("activo", true)
        .order("codigo_numerico"),
      supabase
        .from("normas")
        .select("id, codigo, nombre_corto, nombre_completo")
        .eq("activo", true)
        .order("orden_visualizacion"),
      supabase
        .from("paises")
        .select("id, codigo, nombre")
        .eq("activo", true)
        .order("orden_visualizacion"),
    ]);

  return {
    tipos: tipos ?? [],
    procesos: procesos ?? [],
    normas: normas ?? [],
    paises: paises ?? [],
  };
}

/**
 * Lista los documentos que pueden ser "padre" en un proceso dado.
 * Solo se incluyen documentos de nivel jerárquico <= 3 (no hijos de otro).
 */
export async function listarPosiblesPadres(procesoId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documentos")
    .select(
      `
      id,
      codigo,
      titulo,
      tipo:tipos_documentales (codigo, nombre, nivel_jerarquico, puede_tener_padre)
      `,
    )
    .eq("proceso_principal_id", procesoId)
    .is("eliminado_en", null)
    .is("documento_padre_id", null)
    .order("codigo");

  if (error || !data) return [];

  // Filtrar: solo niveles 1, 2 y 3 (los que pueden tener hijos)
  return data.filter((d) => {
    const t = d.tipo as unknown as { puede_tener_padre: boolean } | null;
    return t !== null && t.puede_tener_padre === false;
  }) as unknown as Array<{
    id: string;
    codigo: string;
    titulo: string;
    tipo: { codigo: string; nombre: string; nivel_jerarquico: number };
  }>;
}

/**
 * Genera el código sugerido usando la función SQL del backend.
 * Retorna null si algún parámetro es inválido.
 */
export async function obtenerCodigoSugerido(params: {
  tipoId: string;
  procesoId: string;
  paisCodigo: string;
  padreId: string | null;
}): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("fn_generar_codigo_documento", {
    p_tipo_id: params.tipoId,
    p_proceso_id: params.procesoId,
    p_pais_codigo: params.paisCodigo,
    p_padre_id: params.padreId,
  });

  if (error) {
    console.error("Error generando código:", error.message);
    return null;
  }
  return (data as string) ?? null;
}
