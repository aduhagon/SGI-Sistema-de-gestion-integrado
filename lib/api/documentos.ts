import { createClient } from "@/lib/supabase/server";

export type DocumentSummary = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion_corta: string | null;
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  documento_padre_id: string | null;
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
  normaIds: string[];
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
  documento_padre_id: string | null;
  tipo: DocumentSummary["tipo"];
  proceso: DocumentSummary["proceso"];
  documento_norma: Array<{
    version_norma: {
      norma_id: string | null;
      norma: { codigo: string; nombre_corto: string } | null;
    } | null;
  }> | null;
};

function normalizar(doc: DocumentoRaw): DocumentSummary {
  const normas =
    (doc.documento_norma ?? [])
      .map((dn) => dn.version_norma?.norma)
      .filter((n): n is { codigo: string; nombre_corto: string } => n !== null && n !== undefined);

  const normaIds =
    (doc.documento_norma ?? [])
      .map((dn) => dn.version_norma?.norma_id)
      .filter((id): id is string => id !== null && id !== undefined);

  return {
    id: doc.id,
    codigo: doc.codigo,
    titulo: doc.titulo,
    descripcion_corta: doc.descripcion_corta,
    estado_actual: doc.estado_actual,
    criticidad: doc.criticidad,
    creado_en: doc.creado_en,
    actualizado_en: doc.actualizado_en,
    documento_padre_id: doc.documento_padre_id,
    tipo: doc.tipo,
    proceso: doc.proceso,
    normas,
    normaIds,
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
  documento_padre_id,
  tipo:tipos_documentales (codigo, nombre, color_hex, icono),
  proceso:procesos!documentos_proceso_principal_id_fkey (codigo, nombre, color_hex),
  documento_norma (
    version_norma:versiones_norma (
      norma_id,
      norma:normas (codigo, nombre_corto)
    )
  )
`;

export type FiltrosDocumentos = {
  texto?: string;
  estado?: string;
  procesoId?: string;
  tipoId?: string;
  normaId?: string;
};

export async function listarDocumentos(
  filtros: FiltrosDocumentos = {},
): Promise<DocumentSummary[]> {
  const supabase = createClient();

  let query = supabase
    .from("documentos")
    .select(SELECT_DOCUMENTO)
    .is("eliminado_en", null);

  if (filtros.estado) {
    query = query.eq("estado_actual", filtros.estado);
  }
  if (filtros.procesoId) {
    query = query.eq("proceso_principal_id", filtros.procesoId);
  }
  if (filtros.tipoId) {
    query = query.eq("tipo_documental_id", filtros.tipoId);
  }
  if (filtros.texto && filtros.texto.trim() !== "") {
    const t = filtros.texto.trim();
    // Busca el texto en el código o en el título.
    query = query.or(`codigo.ilike.%${t}%,titulo.ilike.%${t}%`);
  }

  const { data, error } = await query
    .order("creado_en", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error listando documentos:", error);
    return [];
  }

  const documentos = (data ?? []).map((d) =>
    normalizar(d as unknown as DocumentoRaw),
  );

  // El filtro por norma se aplica en memoria: la norma vive en una relación
  // anidada (documento_norma → versiones_norma → norma_id), many-to-many, y
  // los filtros sobre relaciones anidadas en PostgREST son poco confiables.
  if (filtros.normaId) {
    return documentos.filter((doc) => doc.normaIds.includes(filtros.normaId!));
  }

  return documentos;
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

export type TipoDocumentalForm = {
  id: string;
  codigo: string;
  nombre: string;
  nivel_jerarquico: number | null;
  puede_tener_padre: boolean;
};

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

export type DocumentoParaEditar = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion_corta: string | null;
  criticidad: string;
  confidencialidad: string;
  idioma: string;
  frecuencia_revision: string;
  requiere_acuse_lectura: boolean;
  estado_actual: string;
  tipo: { codigo: string; nombre: string } | null;
  proceso: { codigo: string; nombre: string } | null;
  normas_ids: string[];
  // Cuando la versión más reciente está en borrador o confeccionado, se puede
  // reemplazar el archivo principal desde la misma pantalla de edición (sin
  // crear una versión nueva). Si está aprobada/obsoleta, el archivo no es editable.
  archivoEditable: boolean;
  archivoActual: {
    nombre_original: string;
    extension: string;
    "tamaño_bytes": number;
  } | null;
};

export async function obtenerDocumentoParaEditar(id: string): Promise<DocumentoParaEditar | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documentos")
    .select(
      `
      id,
      codigo,
      titulo,
      descripcion_corta,
      criticidad,
      confidencialidad,
      idioma,
      frecuencia_revision,
      requiere_acuse_lectura,
      estado_actual,
      tipo:tipos_documentales (codigo, nombre),
      proceso:procesos!documentos_proceso_principal_id_fkey (codigo, nombre),
      documento_norma (
        version_norma:versiones_norma (
          norma_id
        )
      )
      `,
    )
    .eq("id", id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !data) return null;

  const raw = data as unknown as {
    id: string;
    codigo: string;
    titulo: string;
    descripcion_corta: string | null;
    criticidad: string;
    confidencialidad: string;
    idioma: string;
    frecuencia_revision: string;
    requiere_acuse_lectura: boolean;
    estado_actual: string;
    tipo: { codigo: string; nombre: string } | null;
    proceso: { codigo: string; nombre: string } | null;
    documento_norma: Array<{ version_norma: { norma_id: string } | null }>;
  };

  const normas_ids = raw.documento_norma
    .map((dn) => dn.version_norma?.norma_id)
    .filter((id): id is string => id !== null && id !== undefined);

  // Versión más reciente del documento + su archivo principal. El archivo solo
  // es editable in-situ cuando esa versión está en borrador o confeccionado;
  // si ya fue enviada/aprobada, el cambio de contenido exige nueva versión.
  let archivoEditable = false;
  let archivoActual: DocumentoParaEditar["archivoActual"] = null;

  const { data: versionReciente } = await supabase
    .from("versiones")
    .select(
      `
      estado,
      archivos (
        tipo_archivo,
        nombre_original,
        extension,
        "tamaño_bytes"
      )
      `,
    )
    .eq("documento_id", raw.id)
    .eq("activo", true)
    .order("numero_orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionReciente) {
    const estadoVersion = versionReciente.estado as string;
    archivoEditable = ["borrador", "confeccionado"].includes(estadoVersion);

    const archivos =
      (versionReciente.archivos as Array<{
        tipo_archivo: string;
        nombre_original: string;
        extension: string;
        "tamaño_bytes": number;
      }>) ?? [];
    const principal = archivos.find((a) => a.tipo_archivo === "principal");
    if (principal) {
      archivoActual = {
        nombre_original: principal.nombre_original,
        extension: principal.extension,
        "tamaño_bytes": principal["tamaño_bytes"],
      };
    }
  }

  return {
    id: raw.id,
    codigo: raw.codigo,
    titulo: raw.titulo,
    descripcion_corta: raw.descripcion_corta,
    criticidad: raw.criticidad,
    confidencialidad: raw.confidencialidad,
    idioma: raw.idioma,
    frecuencia_revision: raw.frecuencia_revision,
    requiere_acuse_lectura: raw.requiere_acuse_lectura,
    estado_actual: raw.estado_actual,
    tipo: raw.tipo,
    proceso: raw.proceso,
    normas_ids,
    archivoEditable,
    archivoActual,
  };
}

export type VersionHistorial = {
  id: string;
  numero_version: string;
  numero_orden: number;
  estado: string;
  es_vigente: boolean;
  creado_en: string;
  motivo_cambio: string | null;
  archivo: {
    nombre_original: string;
    "tamaño_bytes": number;
    extension: string;
    hash_sha256: string;
  } | null;
};

export async function obtenerHistorialVersiones(documentoId: string): Promise<VersionHistorial[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("versiones")
    .select(
      `
      id,
      numero_version,
      numero_orden,
      estado,
      es_vigente,
      creado_en,
      motivo_cambio,
      archivos (
        tipo_archivo,
        nombre_original,
        "tamaño_bytes",
        extension,
        hash_sha256
      )
      `,
    )
    .eq("documento_id", documentoId)
    .eq("activo", true)
    .order("numero_orden", { ascending: false });

  if (error || !data) return [];

  return data.map((v) => {
    const archivos = (v.archivos as Array<{
      tipo_archivo: string;
      nombre_original: string;
      "tamaño_bytes": number;
      extension: string;
      hash_sha256: string;
    }>) ?? [];
    const principal = archivos.find((a) => a.tipo_archivo === "principal");

    return {
      id: v.id as string,
      numero_version: v.numero_version as string,
      numero_orden: v.numero_orden as number,
      estado: v.estado as string,
      es_vigente: v.es_vigente as boolean,
      creado_en: v.creado_en as string,
      motivo_cambio: v.motivo_cambio as string | null,
      archivo: principal
        ? {
            nombre_original: principal.nombre_original,
            "tamaño_bytes": principal["tamaño_bytes"],
            extension: principal.extension,
            hash_sha256: principal.hash_sha256,
          }
        : null,
    };
  });
}

export async function calcularProximoNumeroVersion(documentoId: string): Promise<{
  numeroVersion: string;
  numeroOrden: number;
}> {
  const supabase = createClient();

  const { data } = await supabase
    .from("versiones")
    .select("numero_orden, numero_version")
    .eq("documento_id", documentoId)
    .eq("activo", true)
    .order("numero_orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { numeroVersion: "1.0", numeroOrden: 1 };
  }

  const proximoOrden = (data.numero_orden as number) + 1;
  return {
    numeroVersion: `${proximoOrden}.0`,
    numeroOrden: proximoOrden,
  };
}
