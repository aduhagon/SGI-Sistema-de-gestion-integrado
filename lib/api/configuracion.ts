import { createClient } from "@/lib/supabase/server";

export type ConteosConfig = {
  usuarios: number;
  procesos: number;
  tipos: number;
  normas: number;
  areas: number;
  sedes: number;
  puestos: number;
  participaciones: number;
  politicas: number;
};

export async function obtenerConteosConfig(): Promise<ConteosConfig> {
  const supabase = createClient();

  const cuenta = async (tabla: string, filtro?: (q: any) => any) => {
    let q = supabase.from(tabla).select("id", { count: "exact", head: true });
    if (filtro) q = filtro(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [usuarios, procesos, tipos, normas, areas, sedes, puestos, participaciones, politicas] =
    await Promise.all([
      cuenta("usuarios", (q) => q.is("eliminado_en", null)),
      cuenta("procesos", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("tipos_documentales", (q) => q.eq("activo", true)),
      cuenta("normas", (q) => q.eq("activo", true)),
      cuenta("areas", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("sedes", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("puestos", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("participacion_usuario_proceso", (q) => q.is("vigente_hasta", null)),
      cuenta("politicas_retencion"),
    ]);

  return { usuarios, procesos, tipos, normas, areas, sedes, puestos, participaciones, politicas };
}

// ---- Áreas ----
export type Area = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  gerenciaId: string | null;
  gerenciaNombre: string | null;
};

export async function listarAreas(): Promise<Area[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre, descripcion, area_padre_id")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];

  const filas = (data ?? []) as any[];
  // Mapa id -> nombre para resolver la gerencia (área padre) en memoria,
  // evitando el join autorreferente de PostgREST que es frágil.
  const nombrePorId = new Map<string, string>();
  for (const a of filas) nombrePorId.set(a.id, a.nombre);

  return filas.map((a) => ({
    id: a.id,
    codigo: a.codigo,
    nombre: a.nombre,
    descripcion: a.descripcion,
    gerenciaId: a.area_padre_id,
    gerenciaNombre: a.area_padre_id ? nombrePorId.get(a.area_padre_id) ?? null : null,
  }));
}

export async function listarGerencias(): Promise<
  Array<{ id: string; codigo: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .like("codigo", "GER-%")
    .order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []) as Array<{ id: string; codigo: string; nombre: string }>;
}

// ---- Sedes ----
export type Sede = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  localidad: string | null;
  provincia: string | null;
  pais: string | null;
  tipoSede: string | null;
  esSedePrincipal: boolean;
};

export async function listarSedes(): Promise<Sede[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("id, codigo, nombre, descripcion, localidad, provincia, pais, tipo_sede, es_sede_principal")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];
  return ((data ?? []) as any[]).map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    descripcion: s.descripcion,
    localidad: s.localidad,
    provincia: s.provincia,
    pais: s.pais,
    tipoSede: s.tipo_sede,
    esSedePrincipal: s.es_sede_principal,
  }));
}

// ---- Normas ----
export type NormaEstadoGestion =
  | "no_gestionada"
  | "en_preparacion"
  | "activa"
  | "suspendida";

export type NormaEstadoCertificacion =
  | "no_aplica"
  | "en_vias"
  | "certificada"
  | "vencida";

export type NormaCatalogo = {
  id: string;
  codigo: string;
  nombreCorto: string;
  nombreCompleto: string;
  descripcion: string | null;
  organismoEmisor: string | null;
  sitioWeb: string | null;
  ambito: string | null;
  estadoGestion: NormaEstadoGestion;
  estadoCertificacion: NormaEstadoCertificacion;
  certificadaPorMsu: boolean;
  ordenVisualizacion: number;
};

export async function listarNormasCatalogo(): Promise<NormaCatalogo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("normas")
    .select("id, codigo, nombre_corto, nombre_completo, descripcion, organismo_emisor, sitio_web, ambito, estado_gestion, estado_certificacion, certificada_por_msu, orden_visualizacion")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true })
    .order("codigo", { ascending: true });
  if (error) return [];
  return ((data ?? []) as any[]).map((n) => ({
    id: n.id,
    codigo: n.codigo,
    nombreCorto: n.nombre_corto,
    nombreCompleto: n.nombre_completo,
    descripcion: n.descripcion,
    organismoEmisor: n.organismo_emisor,
    sitioWeb: n.sitio_web,
    ambito: n.ambito,
    estadoGestion: n.estado_gestion,
    estadoCertificacion: n.estado_certificacion,
    certificadaPorMsu: n.certificada_por_msu,
    ordenVisualizacion: n.orden_visualizacion,
  }));
}

// ---- Procesos (catálogo) ----
export type ProcesoCatalogo = {
  id: string;
  codigo: string;
  codigoNumerico: string | null;
  nombre: string;
  descripcionCorta: string | null;
  tipo: string;
  procesoPadreId: string | null;
  procesoPadreNombre: string | null;
  ordenVisualizacion: number;
};

export async function listarProcesosCatalogo(): Promise<ProcesoCatalogo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, codigo_numerico, nombre, descripcion_corta, tipo, proceso_padre_id, orden_visualizacion")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("tipo", { ascending: true })
    .order("orden_visualizacion", { ascending: true });
  if (error) return [];

  const filas = (data ?? []) as any[];
  // Resolver nombre del proceso padre en memoria (join autorreferente falla en PostgREST).
  const nombrePorId = new Map(filas.map((p) => [p.id, p.nombre]));
  return filas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    codigoNumerico: p.codigo_numerico,
    nombre: p.nombre,
    descripcionCorta: p.descripcion_corta,
    tipo: p.tipo,
    procesoPadreId: p.proceso_padre_id,
    procesoPadreNombre: p.proceso_padre_id ? (nombrePorId.get(p.proceso_padre_id) ?? null) : null,
    ordenVisualizacion: p.orden_visualizacion,
  }));
}

// ---- Tipos documentales ----
export type NivelJerarquicoTipo = "gerente" | "jefatura" | "analista" | "operativo";

export type TipoDocumental = {
  id: string;
  codigo: string;
  nombre: string;
  nombrePlural: string;
  descripcion: string | null;
  requiereAprobacion: boolean;
  requiereAcuseLectura: boolean;
  frecuenciaRevisionDefault: string | null;
  criticidadDefault: string | null;
  confidencialidadDefault: string | null;
  ordenVisualizacion: number;
  nivelJerarquico: number | null;
  // Regla de aprobación (de reglas_aprobacion_tipo). null = sin regla configurada.
  nivelRevisor: NivelJerarquicoTipo | null;
  nivelN1: NivelJerarquicoTipo | null;
  nivelN2: NivelJerarquicoTipo | null;
};

export async function listarTiposDocumentales(): Promise<TipoDocumental[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tipos_documentales")
    .select(
      "id, codigo, nombre, nombre_plural, descripcion, requiere_aprobacion, requiere_acuse_lectura, frecuencia_revision_default, criticidad_default, confidencialidad_default, orden_visualizacion, nivel_jerarquico, reglas_aprobacion_tipo (nivel_revisor, nivel_n1, nivel_n2)",
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true })
    .order("codigo", { ascending: true });
  if (error) return [];
  return ((data ?? []) as any[]).map((t) => {
    // reglas_aprobacion_tipo es 1:1 pero PostgREST lo devuelve como array.
    const regla = Array.isArray(t.reglas_aprobacion_tipo)
      ? t.reglas_aprobacion_tipo[0] ?? null
      : t.reglas_aprobacion_tipo ?? null;
    return {
      id: t.id,
      codigo: t.codigo,
      nombre: t.nombre,
      nombrePlural: t.nombre_plural,
      descripcion: t.descripcion,
      requiereAprobacion: t.requiere_aprobacion,
      requiereAcuseLectura: t.requiere_acuse_lectura,
      frecuenciaRevisionDefault: t.frecuencia_revision_default,
      criticidadDefault: t.criticidad_default,
      confidencialidadDefault: t.confidencialidad_default,
      ordenVisualizacion: t.orden_visualizacion,
      nivelJerarquico: t.nivel_jerarquico,
      nivelRevisor: regla?.nivel_revisor ?? null,
      nivelN1: regla?.nivel_n1 ?? null,
      nivelN2: regla?.nivel_n2 ?? null,
    };
  });
}

// ---- Puestos ----
export type Puesto = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  areaId: string | null;
  areaNombre: string | null;
  gerenciaId: string | null;
  gerenciaNombre: string | null;
  reportaAId: string | null;
  reportaACodigo: string | null;
  reportaANombre: string | null;
  nivelJerarquico: "gerente" | "jefatura" | "analista" | "operativo" | null;
};

export async function listarPuestos(): Promise<Puesto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("puestos")
    .select("id, codigo, nombre, descripcion, area_id, reporta_a_id, nivel_jerarquico")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];

  // Resolver nombre de área + su gerencia (área padre) en memoria.
  const filas = (data ?? []) as any[];
  const areaIds = [...new Set(filas.map((p) => p.area_id).filter(Boolean))];
  const nombreArea = new Map<string, string>();
  const padreDeArea = new Map<string, string | null>();
  const nombrePorAreaId = new Map<string, string>();
  if (areaIds.length > 0) {
    const { data: areas } = await supabase
      .from("areas")
      .select("id, nombre, area_padre_id")
      .in("id", areaIds);
    for (const a of (areas ?? []) as any[]) {
      nombreArea.set(a.id, a.nombre);
      padreDeArea.set(a.id, a.area_padre_id ?? null);
    }
    const padreIds = [...new Set([...padreDeArea.values()].filter(Boolean) as string[])];
    if (padreIds.length > 0) {
      const { data: padres } = await supabase
        .from("areas")
        .select("id, nombre")
        .in("id", padreIds);
      for (const g of (padres ?? []) as any[]) nombrePorAreaId.set(g.id, g.nombre);
    }
  }

  // Resolver el puesto superior (reporta_a_id) en memoria, sin depender del
  // embed de PostgREST (los self-joins por nombre de FK son frágiles ante el
  // schema cache). Segundo query sobre la misma tabla.
  const supIds = [...new Set(filas.map((p) => p.reporta_a_id).filter(Boolean))];
  const supPorId = new Map<string, { codigo: string; nombre: string }>();
  if (supIds.length > 0) {
    const { data: sups } = await supabase
      .from("puestos")
      .select("id, codigo, nombre")
      .in("id", supIds);
    for (const s of (sups ?? []) as any[]) supPorId.set(s.id, { codigo: s.codigo, nombre: s.nombre });
  }

  return filas.map((p) => {
    const gerenciaId = p.area_id ? padreDeArea.get(p.area_id) ?? null : null;
    const sup = p.reporta_a_id ? supPorId.get(p.reporta_a_id) ?? null : null;
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      areaId: p.area_id,
      areaNombre: p.area_id ? nombreArea.get(p.area_id) ?? null : null,
      gerenciaId,
      gerenciaNombre: gerenciaId ? nombrePorAreaId.get(gerenciaId) ?? null : null,
      reportaAId: p.reporta_a_id ?? null,
      reportaACodigo: sup?.codigo ?? null,
      reportaANombre: sup?.nombre ?? null,
      nivelJerarquico: p.nivel_jerarquico ?? null,
    };
  });
}

// Áreas para el selector del formulario de puesto (todas las áreas activas).
export async function listarAreasParaSelector(): Promise<
  Array<{ id: string; codigo: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []) as Array<{ id: string; codigo: string; nombre: string }>;
}

// ---- Políticas de retención ----
export type PoliticaRetencion = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoDocumentalId: string | null;
  tipoDocumentalNombre: string | null;
  normaId: string | null;
  normaNombre: string | null;
  procesoId: string | null;
  procesoNombre: string | null;
  criticidadAplicable: string | null;
  aniosVersionesObsoletas: number;
  aniosEventosAuditoria: number;
  aniosFirmas: number;
  aniosAcuses: number;
  aniosDocumentosInactivos: number | null;
  politicaPurga: string;
  fundamentoAprobacion: string | null;
  vigente: boolean;
};

export async function listarPoliticasRetencion(): Promise<PoliticaRetencion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("politicas_retencion")
    .select(
      `id, codigo, nombre, descripcion, tipo_documental_id, norma_id, proceso_id,
       criticidad_aplicable, "años_retencion_versiones_obsoletas", "años_retencion_eventos_auditoria",
       "años_retencion_firmas", "años_retencion_acuses", "años_retencion_documentos_inactivos",
       politica_purga, fundamento_aprobacion, vigente_hasta`,
    )
    .is("vigente_hasta", null)
    .order("codigo", { ascending: true });
  if (error) return [];

  const filas = (data ?? []) as any[];

  // Resolver nombres de ámbito en memoria.
  const [tiposR, normasR, procesosR] = await Promise.all([
    supabase.from("tipos_documentales").select("id, nombre"),
    supabase.from("normas").select("id, nombre_corto"),
    supabase.from("procesos").select("id, nombre"),
  ]);
  const tiposMap = new Map(((tiposR.data ?? []) as any[]).map((t) => [t.id, t.nombre]));
  const normasMap = new Map(((normasR.data ?? []) as any[]).map((n) => [n.id, n.nombre_corto]));
  const procesosMap = new Map(((procesosR.data ?? []) as any[]).map((p) => [p.id, p.nombre]));

  return filas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    tipoDocumentalId: p.tipo_documental_id,
    tipoDocumentalNombre: p.tipo_documental_id ? (tiposMap.get(p.tipo_documental_id) ?? null) : null,
    normaId: p.norma_id,
    normaNombre: p.norma_id ? (normasMap.get(p.norma_id) ?? null) : null,
    procesoId: p.proceso_id,
    procesoNombre: p.proceso_id ? (procesosMap.get(p.proceso_id) ?? null) : null,
    criticidadAplicable: p.criticidad_aplicable,
    aniosVersionesObsoletas: p["años_retencion_versiones_obsoletas"],
    aniosEventosAuditoria: p["años_retencion_eventos_auditoria"],
    aniosFirmas: p["años_retencion_firmas"],
    aniosAcuses: p["años_retencion_acuses"],
    aniosDocumentosInactivos: p["años_retencion_documentos_inactivos"],
    politicaPurga: p.politica_purga,
    fundamentoAprobacion: p.fundamento_aprobacion,
    vigente: p.vigente_hasta === null,
  }));
}
