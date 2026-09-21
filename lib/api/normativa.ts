import { createClient } from "@/lib/supabase/server";

// ---- Versiones de norma ----
export type VersionNorma = {
  id: string;
  normaId: string;
  version: string;
  nombreVersion: string | null;
  fechaPublicacion: string | null;
  fechaVigenciaDesde: string | null;
  fechaVigenciaHasta: string | null;
  esVersionActual: boolean;
  urlDescarga: string | null;
  cantidadRequisitos: number;
};

export type NormaConVersiones = {
  id: string;
  codigo: string;
  nombreCorto: string;
  nombreCompleto: string;
  organismoEmisor: string | null;
  ambito: string | null;
};

export async function obtenerNorma(id: string): Promise<NormaConVersiones | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("normas")
    .select("id, codigo, nombre_corto, nombre_completo, organismo_emisor, ambito")
    .eq("id", id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    codigo: data.codigo,
    nombreCorto: data.nombre_corto,
    nombreCompleto: data.nombre_completo,
    organismoEmisor: data.organismo_emisor,
    ambito: data.ambito,
  };
}

export async function listarVersionesDeNorma(normaId: string): Promise<VersionNorma[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("versiones_norma")
    .select("id, norma_id, version, nombre_version, fecha_publicacion, fecha_vigencia_desde, fecha_vigencia_hasta, es_version_actual, url_descarga")
    .eq("norma_id", normaId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("es_version_actual", { ascending: false })
    .order("version", { ascending: false });
  if (error) return [];

  const versiones = (data ?? []) as any[];
  // Contar requisitos por versión.
  const ids = versiones.map((v) => v.id);
  const conteo = new Map<string, number>();
  if (ids.length > 0) {
    const { data: reqs } = await supabase
      .from("requisitos")
      .select("version_norma_id")
      .in("version_norma_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null);
    for (const r of (reqs ?? []) as any[]) {
      conteo.set(r.version_norma_id, (conteo.get(r.version_norma_id) ?? 0) + 1);
    }
  }

  return versiones.map((v) => ({
    id: v.id,
    normaId: v.norma_id,
    version: v.version,
    nombreVersion: v.nombre_version,
    fechaPublicacion: v.fecha_publicacion,
    fechaVigenciaDesde: v.fecha_vigencia_desde,
    fechaVigenciaHasta: v.fecha_vigencia_hasta,
    esVersionActual: v.es_version_actual,
    urlDescarga: v.url_descarga,
    cantidadRequisitos: conteo.get(v.id) ?? 0,
  }));
}

// ---- Requisitos ----
export type Requisito = {
  id: string;
  clausula: string;
  titulo: string;
  descripcion: string | null;
  nivelJerarquia: number;
  esObligatorio: boolean;
  esCritico: boolean;
};

export type VersionConNorma = {
  id: string;
  version: string;
  nombreVersion: string | null;
  normaId: string;
  normaNombre: string;
  normaCodigo: string;
};

export async function obtenerVersion(id: string): Promise<VersionConNorma | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("versiones_norma")
    .select(`id, version, nombre_version, norma_id,
      norma:normas!versiones_norma_norma_id_fkey (nombre_corto, codigo)`)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id,
    version: d.version,
    nombreVersion: d.nombre_version,
    normaId: d.norma_id,
    normaNombre: d.norma?.nombre_corto ?? "—",
    normaCodigo: d.norma?.codigo ?? "—",
  };
}

// Orden natural de cláusula: "10.2" después de "9", "4.1" antes de "4.10".
function compararClausula(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10));
  const pb = b.split(".").map((x) => parseInt(x, 10));
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

export async function listarRequisitosDeVersion(versionId: string): Promise<Requisito[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requisitos")
    .select("id, clausula, titulo, descripcion, nivel_jerarquia, es_obligatorio, es_critico")
    .eq("version_norma_id", versionId)
    .eq("activo", true)
    .is("eliminado_en", null);
  if (error) return [];
  return ((data ?? []) as any[])
    .map((r) => ({
      id: r.id,
      clausula: r.clausula,
      titulo: r.titulo,
      descripcion: r.descripcion,
      nivelJerarquia: r.nivel_jerarquia,
      esObligatorio: r.es_obligatorio,
      esCritico: r.es_critico,
    }))
    .sort((a, b) => compararClausula(a.clausula, b.clausula));
}


// ---- Relaciones entre normas ----
export const TIPOS_RELACION_NORMA = [
  "reglamenta",
  "complementa",
  "modifica",
  "sustituye",
  "deroga",
  "depende_de",
] as const;

export type TipoRelacionNorma = (typeof TIPOS_RELACION_NORMA)[number];

export type NormaRelacionable = {
  id: string;
  codigo: string;
  nombreCorto: string;
};

export type RelacionNorma = {
  id: string;
  sentido: "saliente" | "entrante";
  tipo: TipoRelacionNorma;
  etiqueta: string;
  normaRelacionada: NormaRelacionable;
  articulosAfectados: string | null;
  observacion: string | null;
  fuenteUrl: string | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
};

const ETIQUETAS_RELACION: Record<TipoRelacionNorma, { saliente: string; entrante: string }> = {
  reglamenta: { saliente: "Reglamenta a", entrante: "Es reglamentada por" },
  complementa: { saliente: "Complementa a", entrante: "Es complementada por" },
  modifica: { saliente: "Modifica a", entrante: "Es modificada por" },
  sustituye: { saliente: "Sustituye a", entrante: "Es sustituida por" },
  deroga: { saliente: "Deroga a", entrante: "Es derogada por" },
  depende_de: { saliente: "Depende de", entrante: "Es norma principal de" },
};

export async function listarNormasParaRelacion(excluirId: string): Promise<NormaRelacionable[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("normas")
    .select("id, codigo, nombre_corto")
    .neq("id", excluirId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("nombre_corto");
  if (error) return [];
  return (data ?? []).map((n: any) => ({
    id: n.id,
    codigo: n.codigo,
    nombreCorto: n.nombre_corto,
  }));
}

export async function listarRelacionesNorma(normaId: string): Promise<RelacionNorma[]> {
  const supabase = createClient();
  const campos = `
    id, norma_origen_id, norma_destino_id, tipo, articulos_afectados,
    observacion, fuente_url, vigente_desde, vigente_hasta,
    norma_origen:normas!normas_relaciones_norma_origen_id_fkey(id,codigo,nombre_corto),
    norma_destino:normas!normas_relaciones_norma_destino_id_fkey(id,codigo,nombre_corto)
  `;
  const { data, error } = await supabase
    .from("normas_relaciones")
    .select(campos)
    .or(`norma_origen_id.eq.${normaId},norma_destino_id.eq.${normaId}`)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: true });
  if (error) return [];

  return ((data ?? []) as any[]).map((r) => {
    const saliente = r.norma_origen_id === normaId;
    const relacionada = saliente ? r.norma_destino : r.norma_origen;
    const tipo = r.tipo as TipoRelacionNorma;
    return {
      id: r.id,
      sentido: saliente ? "saliente" : "entrante",
      tipo,
      etiqueta: ETIQUETAS_RELACION[tipo][saliente ? "saliente" : "entrante"],
      normaRelacionada: {
        id: relacionada.id,
        codigo: relacionada.codigo,
        nombreCorto: relacionada.nombre_corto,
      },
      articulosAfectados: r.articulos_afectados,
      observacion: r.observacion,
      fuenteUrl: r.fuente_url,
      vigenteDesde: r.vigente_desde,
      vigenteHasta: r.vigente_hasta,
    };
  });
}
