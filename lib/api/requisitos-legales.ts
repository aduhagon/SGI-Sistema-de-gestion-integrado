import { createClient } from "@/lib/supabase/server";

export type EstadoCumplimiento =
  | "cumple"
  | "cumple_parcial"
  | "no_cumple"
  | "no_aplica"
  | "pendiente_evaluacion";

export type RequisitoLegal = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  jurisdiccion: string | null;
  organismoEmisor: string | null;
  referencia: string | null;
  fechaVigenciaDesde: string | null;
  urlFuente: string | null;
  normaId: string | null;
  normaNombre: string | null;
  criticidad: string | null;
  observaciones: string | null;
  procesos: Array<{ id: string; codigo: string; nombre: string }>;
  // Último estado de cumplimiento conocido (de la evaluación más reciente).
  ultimoEstado: EstadoCumplimiento | null;
  ultimaEvaluacion: string | null;
  proximaEvaluacion: string | null;
};

export async function listarRequisitosLegales(): Promise<RequisitoLegal[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requisitos_legales")
    .select(
      "id, codigo, titulo, descripcion, tipo, jurisdiccion, organismo_emisor, referencia, fecha_vigencia_desde, url_fuente, norma_id, criticidad, observaciones",
    )
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });

  if (error) return [];
  const filas = (data ?? []) as any[];
  if (filas.length === 0) return [];

  const ids = filas.map((r) => r.id);

  // Nombres de norma (resueltos en memoria, evita join frágil de PostgREST).
  const normaIds = [...new Set(filas.map((r) => r.norma_id).filter(Boolean))];
  const normaNombre = new Map<string, string>();
  if (normaIds.length > 0) {
    const { data: normas } = await supabase
      .from("normas")
      .select("id, nombre_corto")
      .in("id", normaIds);
    for (const n of (normas ?? []) as any[]) normaNombre.set(n.id, n.nombre_corto);
  }

  // Vínculos a procesos.
  const { data: vinculos } = await supabase
    .from("requisito_legal_proceso")
    .select("requisito_legal_id, proceso_id")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null);

  const procIds = [
    ...new Set(((vinculos ?? []) as any[]).map((v) => v.proceso_id).filter(Boolean)),
  ];
  const procInfo = new Map<string, { codigo: string; nombre: string }>();
  if (procIds.length > 0) {
    const { data: procs } = await supabase
      .from("procesos")
      .select("id, codigo, nombre")
      .in("id", procIds);
    for (const p of (procs ?? []) as any[])
      procInfo.set(p.id, { codigo: p.codigo, nombre: p.nombre });
  }
  const procesosPorReq = new Map<string, Array<{ id: string; codigo: string; nombre: string }>>();
  for (const v of (vinculos ?? []) as any[]) {
    const info = procInfo.get(v.proceso_id);
    if (!info) continue;
    const arr = procesosPorReq.get(v.requisito_legal_id) ?? [];
    arr.push({ id: v.proceso_id, codigo: info.codigo, nombre: info.nombre });
    procesosPorReq.set(v.requisito_legal_id, arr);
  }

  // Última evaluación por requisito.
  const { data: evals } = await supabase
    .from("evaluaciones_cumplimiento")
    .select("requisito_legal_id, estado, fecha_evaluacion, proxima_evaluacion")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null)
    .order("fecha_evaluacion", { ascending: false });

  const ultimaEval = new Map<
    string,
    { estado: EstadoCumplimiento; fecha: string; proxima: string | null }
  >();
  for (const e of (evals ?? []) as any[]) {
    if (!ultimaEval.has(e.requisito_legal_id)) {
      ultimaEval.set(e.requisito_legal_id, {
        estado: e.estado,
        fecha: e.fecha_evaluacion,
        proxima: e.proxima_evaluacion,
      });
    }
  }

  return filas.map((r) => {
    const ev = ultimaEval.get(r.id);
    return {
      id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      descripcion: r.descripcion,
      tipo: r.tipo,
      jurisdiccion: r.jurisdiccion,
      organismoEmisor: r.organismo_emisor,
      referencia: r.referencia,
      fechaVigenciaDesde: r.fecha_vigencia_desde,
      urlFuente: r.url_fuente,
      normaId: r.norma_id,
      normaNombre: r.norma_id ? (normaNombre.get(r.norma_id) ?? null) : null,
      criticidad: r.criticidad,
      observaciones: r.observaciones,
      procesos: procesosPorReq.get(r.id) ?? [],
      ultimoEstado: ev?.estado ?? null,
      ultimaEvaluacion: ev?.fecha ?? null,
      proximaEvaluacion: ev?.proxima ?? null,
    };
  });
}

export type EvaluacionFila = {
  id: string;
  estado: EstadoCumplimiento;
  evidencia: string | null;
  fechaEvaluacion: string;
  proximaEvaluacion: string | null;
  observaciones: string | null;
  procesoNombre: string | null;
  evaluadoPorNombre: string | null;
};

export async function listarEvaluacionesDeRequisito(
  requisitoLegalId: string,
): Promise<EvaluacionFila[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evaluaciones_cumplimiento")
    .select(
      "id, estado, evidencia, fecha_evaluacion, proxima_evaluacion, observaciones, proceso_id, evaluado_por",
    )
    .eq("requisito_legal_id", requisitoLegalId)
    .is("eliminado_en", null)
    .order("fecha_evaluacion", { ascending: false });
  if (error) return [];

  const filas = (data ?? []) as any[];
  if (filas.length === 0) return [];

  const procIds = [...new Set(filas.map((f) => f.proceso_id).filter(Boolean))];
  const userIds = [...new Set(filas.map((f) => f.evaluado_por).filter(Boolean))];

  const procNombre = new Map<string, string>();
  if (procIds.length > 0) {
    const { data: procs } = await supabase
      .from("procesos")
      .select("id, nombre")
      .in("id", procIds);
    for (const p of (procs ?? []) as any[]) procNombre.set(p.id, p.nombre);
  }
  const userNombre = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: us } = await supabase
      .from("usuarios")
      .select("id, nombre_completo")
      .in("id", userIds);
    for (const u of (us ?? []) as any[]) userNombre.set(u.id, u.nombre_completo);
  }

  return filas.map((f) => ({
    id: f.id,
    estado: f.estado,
    evidencia: f.evidencia,
    fechaEvaluacion: f.fecha_evaluacion,
    proximaEvaluacion: f.proxima_evaluacion,
    observaciones: f.observaciones,
    procesoNombre: f.proceso_id ? (procNombre.get(f.proceso_id) ?? null) : null,
    evaluadoPorNombre: f.evaluado_por ? (userNombre.get(f.evaluado_por) ?? null) : null,
  }));
}

// Procesos para el selector (mismo patrón que el resto del sistema).
export async function listarProcesosParaSelector(): Promise<
  Array<{ id: string; codigo: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true });
  if (error) return [];
  return (data ?? []) as Array<{ id: string; codigo: string; nombre: string }>;
}

// Normas para el selector (vínculo opcional a "otros requisitos" ISO).
export async function listarNormasParaSelector(): Promise<
  Array<{ id: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("normas")
    .select("id, nombre_corto")
    .eq("activo", true)
    .order("nombre_corto", { ascending: true });
  if (error) return [];
  return ((data ?? []) as any[]).map((n) => ({ id: n.id, nombre: n.nombre_corto }));
}

export async function sugerirCodigoRequisitoLegal(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sugerir_codigo_requisito_legal", {
    p_prefijo: "RL",
  });
  if (error) return null;
  return (data as string) ?? null;
}
