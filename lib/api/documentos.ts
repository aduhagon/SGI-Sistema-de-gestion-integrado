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

/**
 * Tipo crudo de la respuesta de Supabase con relaciones embebidas.
 * Se normaliza dentro de las funciones para devolver DocumentSummary.
 */
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

/**
 * Lista todos los documentos accesibles para el usuario logueado.
 */
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

/**
 * Lista los documentos asociados a un proceso específico (por código).
 */
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
 * Devuelve los datos necesarios para el form de creación de documento.
 */
export async function obtenerDatosForm() {
  const supabase = createClient();

  const [{ data: tipos }, { data: procesos }, { data: normas }] = await Promise.all([
    supabase
      .from("tipos_documentales")
      .select("id, codigo, nombre, criticidad_default, confidencialidad_default, frecuencia_revision_default, requiere_acuse_lectura")
      .eq("activo", true)
      .order("orden_visualizacion"),
    supabase
      .from("procesos")
      .select("id, codigo, nombre, tipo")
      .eq("activo", true)
      .order("tipo")
      .order("orden_visualizacion"),
    supabase
      .from("normas")
      .select("id, codigo, nombre_corto, nombre_completo")
      .eq("activo", true)
      .order("orden_visualizacion"),
  ]);

  return {
    tipos: tipos ?? [],
    procesos: procesos ?? [],
    normas: normas ?? [],
  };
}
