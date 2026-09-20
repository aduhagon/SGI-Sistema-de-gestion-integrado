import { createClient } from "@/lib/supabase/server";

export type TipoControl = "preventivo" | "detectivo" | "correctivo";
export type EstadoControl = "activo" | "suspendido";
export type ResultadoControl = "efectivo" | "parcial" | "inefectivo" | "no_aplica";

export type VinculoControl = {
  id: string;
  codigo: string;
  nombre: string;
};

export type RequisitoControl = VinculoControl & {
  normaCodigo: string;
  clausula: string;
};

export type Control = {
  id: string;
  codigo: string;
  procesoId: string;
  procesoCodigo: string;
  procesoNombre: string;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  tipo: TipoControl;
  periodicidad: string;
  responsablePuestoId: string | null;
  responsableNombre: string | null;
  instrucciones: string | null;
  requiereEvidencia: boolean;
  anticipacionDias: number;
  proximaEjecucion: string | null;
  ultimaEjecucion: string | null;
  ultimoResultado: ResultadoControl | null;
  estado: EstadoControl;
  riesgos: VinculoControl[];
  requisitos: RequisitoControl[];
  documentos: VinculoControl[];
  indicadores: VinculoControl[];
};

export type ProcesoControlOpcion = { id: string; codigo: string; nombre: string };
export type PuestoControlOpcion = { id: string; codigo: string; nombre: string };
export type RiesgoControlOpcion = VinculoControl & { procesoId: string };
export type DocumentoControlOpcion = VinculoControl & { procesoId: string };
export type IndicadorControlOpcion = VinculoControl & { procesoId: string };
export type RequisitoControlOpcion = RequisitoControl;

export type OpcionesControl = {
  procesos: ProcesoControlOpcion[];
  puestos: PuestoControlOpcion[];
  riesgos: RiesgoControlOpcion[];
  requisitos: RequisitoControlOpcion[];
  documentos: DocumentoControlOpcion[];
  indicadores: IndicadorControlOpcion[];
};

type MapaVinculos<T> = Record<string, T[]>;

function agrupar<T>(filas: any[], transformar: (fila: any) => T | null): MapaVinculos<T> {
  const mapa: MapaVinculos<T> = {};
  for (const fila of filas) {
    const valor = transformar(fila);
    if (!valor) continue;
    if (!mapa[fila.control_id]) mapa[fila.control_id] = [];
    mapa[fila.control_id].push(valor);
  }
  return mapa;
}

export async function listarControles(procesoId?: string): Promise<Control[]> {
  const supabase = createClient();
  let consulta = supabase
    .from("controles")
    .select(
      `id, codigo, proceso_id, nombre, descripcion, objetivo, tipo, periodicidad,
       responsable_puesto_id, instrucciones, requiere_evidencia, anticipacion_dias,
       proxima_ejecucion, ultima_ejecucion, ultimo_resultado, estado,
       proceso:procesos!controles_proceso_id_fkey (codigo, nombre),
       responsable:puestos!controles_responsable_puesto_id_fkey (codigo, nombre)`,
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo");

  if (procesoId) consulta = consulta.eq("proceso_id", procesoId);
  const { data, error } = await consulta;
  if (error) {
    console.error("[SGI:controles] listarControles", error);
    return [];
  }

  const filas = (data ?? []) as any[];
  const ids = filas.map((fila) => fila.id as string);
  if (ids.length === 0) return [];

  const [riesgosRes, requisitosRes, documentosRes, indicadoresRes] = await Promise.all([
    supabase
      .from("control_riesgo")
      .select("control_id, riesgo:riesgos!control_riesgo_riesgo_id_fkey (id, codigo, titulo, activo, eliminado_en)")
      .in("control_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null),
    supabase
      .from("control_requisito")
      .select(
        `control_id,
         requisito:requisitos!control_requisito_requisito_id_fkey (
           id, clausula, titulo, activo, eliminado_en,
           version:versiones_norma!requisitos_version_norma_id_fkey (
             norma:normas!versiones_norma_norma_id_fkey (codigo)
           )
         )`,
      )
      .in("control_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null),
    supabase
      .from("control_documento")
      .select("control_id, documento:documentos!control_documento_documento_id_fkey (id, codigo, titulo, activo, eliminado_en)")
      .in("control_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null),
    supabase
      .from("control_indicador")
      .select("control_id, indicador:indicadores!control_indicador_indicador_id_fkey (id, codigo, nombre, activo, eliminado_en)")
      .in("control_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null),
  ]);

  const riesgos = agrupar<VinculoControl>((riesgosRes.data ?? []) as any[], (fila) =>
    fila.riesgo?.activo && !fila.riesgo.eliminado_en
      ? { id: fila.riesgo.id, codigo: fila.riesgo.codigo, nombre: fila.riesgo.titulo }
      : null,
  );
  const requisitos = agrupar<RequisitoControl>((requisitosRes.data ?? []) as any[], (fila) =>
    fila.requisito?.activo && !fila.requisito.eliminado_en
      ? {
          id: fila.requisito.id,
          codigo: fila.requisito.clausula,
          nombre: fila.requisito.titulo,
          clausula: fila.requisito.clausula,
          normaCodigo: fila.requisito.version?.norma?.codigo ?? "Norma",
        }
      : null,
  );
  const documentos = agrupar<VinculoControl>((documentosRes.data ?? []) as any[], (fila) =>
    fila.documento?.activo && !fila.documento.eliminado_en
      ? { id: fila.documento.id, codigo: fila.documento.codigo, nombre: fila.documento.titulo }
      : null,
  );
  const indicadores = agrupar<VinculoControl>((indicadoresRes.data ?? []) as any[], (fila) =>
    fila.indicador?.activo && !fila.indicador.eliminado_en
      ? { id: fila.indicador.id, codigo: fila.indicador.codigo, nombre: fila.indicador.nombre }
      : null,
  );

  return filas.map((fila) => ({
    id: fila.id,
    codigo: fila.codigo,
    procesoId: fila.proceso_id,
    procesoCodigo: fila.proceso?.codigo ?? "",
    procesoNombre: fila.proceso?.nombre ?? "Proceso",
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    objetivo: fila.objetivo,
    tipo: fila.tipo,
    periodicidad: fila.periodicidad,
    responsablePuestoId: fila.responsable_puesto_id,
    responsableNombre: fila.responsable?.nombre ?? null,
    instrucciones: fila.instrucciones,
    requiereEvidencia: fila.requiere_evidencia,
    anticipacionDias: fila.anticipacion_dias,
    proximaEjecucion: fila.proxima_ejecucion,
    ultimaEjecucion: fila.ultima_ejecucion,
    ultimoResultado: fila.ultimo_resultado,
    estado: fila.estado,
    riesgos: riesgos[fila.id] ?? [],
    requisitos: requisitos[fila.id] ?? [],
    documentos: documentos[fila.id] ?? [],
    indicadores: indicadores[fila.id] ?? [],
  }));
}

export async function obtenerOpcionesControl(): Promise<OpcionesControl> {
  const supabase = createClient();
  const [procesosRes, puestosRes, riesgosRes, requisitosRes, documentosRes, indicadoresRes] =
    await Promise.all([
      supabase
        .from("procesos")
        .select("id, codigo, nombre")
        .eq("activo", true)
        .is("eliminado_en", null)
        .order("nombre"),
      supabase
        .from("puestos")
        .select("id, codigo, nombre")
        .eq("activo", true)
        .is("eliminado_en", null)
        .order("nombre"),
      supabase
        .from("riesgos")
        .select("id, codigo, titulo, proceso_id")
        .eq("activo", true)
        .is("eliminado_en", null)
        .order("codigo"),
      supabase
        .from("requisitos")
        .select(
          `id, clausula, titulo,
           version:versiones_norma!requisitos_version_norma_id_fkey (
             es_version_actual,
             norma:normas!versiones_norma_norma_id_fkey (codigo)
           )`,
        )
        .eq("activo", true)
        .is("eliminado_en", null)
        .order("clausula"),
      supabase
        .from("documentos")
        .select("id, codigo, titulo, proceso_principal_id")
        .eq("activo", true)
        .is("eliminado_en", null)
        .eq("estado_actual", "aprobado")
        .order("codigo"),
      supabase
        .from("indicadores")
        .select("id, codigo, nombre, proceso_id")
        .eq("activo", true)
        .is("eliminado_en", null)
        .order("codigo"),
    ]);

  return {
    procesos: ((procesosRes.data ?? []) as any[]).map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
    })),
    puestos: ((puestosRes.data ?? []) as any[]).map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
    })),
    riesgos: ((riesgosRes.data ?? []) as any[]).map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.titulo,
      procesoId: fila.proceso_id,
    })),
    requisitos: ((requisitosRes.data ?? []) as any[])
      .filter((fila) => fila.version?.es_version_actual)
      .map((fila) => ({
        id: fila.id,
        codigo: fila.clausula,
        nombre: fila.titulo,
        clausula: fila.clausula,
        normaCodigo: fila.version?.norma?.codigo ?? "Norma",
      })),
    documentos: ((documentosRes.data ?? []) as any[]).map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.titulo,
      procesoId: fila.proceso_principal_id,
    })),
    indicadores: ((indicadoresRes.data ?? []) as any[]).map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
      procesoId: fila.proceso_id,
    })),
  };
}

export type RequisitoAplicable = RequisitoControl & {
  origenes: string[];
  aplicabilidad: "aplica" | "no_aplica" | "pendiente";
};

export async function listarRequisitosAplicables(procesoId: string): Promise<RequisitoAplicable[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requisito_proceso")
    .select(
      `aplicabilidad, origenes,
       requisito:requisitos!requisito_proceso_requisito_id_fkey (
         id, clausula, titulo,
         version:versiones_norma!requisitos_version_norma_id_fkey (
           norma:normas!versiones_norma_norma_id_fkey (codigo)
         )
       )`,
    )
    .eq("proceso_id", procesoId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en");

  if (error) {
    console.error("[SGI:controles] listarRequisitosAplicables", error);
    return [];
  }

  return ((data ?? []) as any[])
    .filter((fila) => fila.requisito)
    .map((fila) => ({
      id: fila.requisito.id,
      codigo: fila.requisito.clausula,
      nombre: fila.requisito.titulo,
      clausula: fila.requisito.clausula,
      normaCodigo: fila.requisito.version?.norma?.codigo ?? "Norma",
      origenes: fila.origenes ?? [],
      aplicabilidad: fila.aplicabilidad,
    }));
}

export type ControlRiesgoResumen = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoControl;
  estado: EstadoControl;
  procesoId: string;
  ultimoResultado: ResultadoControl | null;
};

export async function listarControlesPorRiesgo(): Promise<Record<string, ControlRiesgoResumen[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("control_riesgo")
    .select(
      `riesgo_id,
       control:controles!control_riesgo_control_id_fkey (
         id, codigo, nombre, tipo, estado, proceso_id, ultimo_resultado, activo, eliminado_en
       )`,
    )
    .eq("activo", true)
    .is("eliminado_en", null);

  if (error) {
    console.error("[SGI:controles] listarControlesPorRiesgo", error);
    return {};
  }

  const mapa: Record<string, ControlRiesgoResumen[]> = {};
  for (const fila of (data ?? []) as any[]) {
    const control = fila.control;
    if (!control?.activo || control.eliminado_en) continue;
    if (!mapa[fila.riesgo_id]) mapa[fila.riesgo_id] = [];
    mapa[fila.riesgo_id].push({
      id: control.id,
      codigo: control.codigo,
      nombre: control.nombre,
      tipo: control.tipo,
      estado: control.estado,
      procesoId: control.proceso_id,
      ultimoResultado: control.ultimo_resultado,
    });
  }
  return mapa;
}

export async function listarControlesComoOpcion(): Promise<ControlRiesgoResumen[]> {
  const controles = await listarControles();
  return controles.map((control) => ({
    id: control.id,
    codigo: control.codigo,
    nombre: control.nombre,
    tipo: control.tipo,
    estado: control.estado,
    procesoId: control.procesoId,
    ultimoResultado: control.ultimoResultado,
  }));
}
