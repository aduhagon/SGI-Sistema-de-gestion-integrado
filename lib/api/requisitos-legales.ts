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
  // Normas asociadas (N:M). Cada id es un versiones_norma.id.
  normas: Array<{ id: string; nombre: string }>;
  criticidad: string | null;
  observaciones: string | null;
  procesos: Array<{ id: string; codigo: string; nombre: string }>;
  // Último estado de cumplimiento conocido (de la evaluación más reciente).
  ultimoEstado: EstadoCumplimiento | null;
  ultimaEvaluacion: string | null;
  proximaEvaluacion: string | null;
};

export async function listarRequisitosLegales(
  filtroVersionNormaId?: string,
): Promise<RequisitoLegal[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requisitos_legales")
    .select(
      "id, codigo, titulo, descripcion, tipo, jurisdiccion, organismo_emisor, referencia, fecha_vigencia_desde, url_fuente, criticidad, observaciones",
    )
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });

  if (error) return [];
  const filas = (data ?? []) as any[];
  if (filas.length === 0) return [];

  const ids = filas.map((r) => r.id);

  // Normas asociadas (N:M vía requisito_legal_norma -> versiones_norma -> normas).
  // Self-join resuelto en memoria (PostgREST poco fiable con joins encadenados).
  const { data: vinculosNorma } = await supabase
    .from("requisito_legal_norma")
    .select("requisito_legal_id, version_norma_id")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null);

  const versionIds = [
    ...new Set(
      ((vinculosNorma ?? []) as any[]).map((v) => v.version_norma_id).filter(Boolean),
    ),
  ];
  const normaNombrePorVersion = new Map<string, string>();
  if (versionIds.length > 0) {
    const { data: versiones } = await supabase
      .from("versiones_norma")
      .select("id, norma_id")
      .in("id", versionIds);
    const normaIds = [
      ...new Set(((versiones ?? []) as any[]).map((v) => v.norma_id).filter(Boolean)),
    ];
    const nombrePorNorma = new Map<string, string>();
    if (normaIds.length > 0) {
      const { data: normas } = await supabase
        .from("normas")
        .select("id, nombre_corto")
        .in("id", normaIds);
      for (const n of (normas ?? []) as any[]) nombrePorNorma.set(n.id, n.nombre_corto);
    }
    for (const v of (versiones ?? []) as any[]) {
      normaNombrePorVersion.set(v.id, nombrePorNorma.get(v.norma_id) ?? v.id);
    }
  }

  const normasPorReq = new Map<string, Array<{ id: string; nombre: string }>>();
  for (const v of (vinculosNorma ?? []) as any[]) {
    const arr = normasPorReq.get(v.requisito_legal_id) ?? [];
    arr.push({
      id: v.version_norma_id,
      nombre: normaNombrePorVersion.get(v.version_norma_id) ?? v.version_norma_id,
    });
    normasPorReq.set(v.requisito_legal_id, arr);
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

  const resultado = filas.map((r) => {
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
      normas: normasPorReq.get(r.id) ?? [],
      criticidad: r.criticidad,
      observaciones: r.observaciones,
      procesos: procesosPorReq.get(r.id) ?? [],
      ultimoEstado: ev?.estado ?? null,
      ultimaEvaluacion: ev?.fecha ?? null,
      proximaEvaluacion: ev?.proxima ?? null,
    };
  });

  // Filtro por norma (en memoria). "__sin__" = requisitos sin ninguna norma.
  if (filtroVersionNormaId === "__sin__") {
    return resultado.filter((r) => r.normas.length === 0);
  }
  if (filtroVersionNormaId) {
    return resultado.filter((r) =>
      r.normas.some((n) => n.id === filtroVersionNormaId),
    );
  }
  return resultado;
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

// Normas para el selector. Devuelve el id de la VERSIÓN VIGENTE de cada norma
// (versiones_norma.id), que es lo que referencia la N:M requisito_legal_norma.
export async function listarNormasParaSelector(): Promise<
  Array<{ id: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("versiones_norma")
    .select("id, norma_id, normas!inner(nombre_corto, activo)")
    .eq("es_version_actual", true)
    .is("eliminado_en", null);
  if (error) return [];
  return ((data ?? []) as any[])
    .filter((v) => v.normas?.activo === true)
    .map((v) => ({ id: v.id, nombre: v.normas?.nombre_corto ?? v.id }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ---- Export a Excel: fila con TODOS los campos del requisito ----
export type FilaExportRequisito = {
  codigo: string;
  titulo: string;
  tipo: string;
  categoria: string | null;
  jurisdiccion: string | null;
  organismoEmisor: string | null;
  referencia: string | null;
  articulosAplicables: string | null;
  fechaVigenciaDesde: string | null;
  normas: string;
  procesos: string;
  criticidad: string | null;
  requiereVerificacion: boolean;
  sanciones: string | null;
  referenciaSanciones: string | null;
  ultimoEstado: string | null;
  ultimaEvaluacion: string | null;
  proximaEvaluacion: string | null;
  urlFuente: string | null;
  descripcion: string | null;
  observaciones: string | null;
};

export async function datosParaExportarRequisitos(
  filtroVersionNormaId?: string,
): Promise<FilaExportRequisito[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("requisitos_legales")
    .select(
      "id, codigo, titulo, descripcion, tipo, categoria, jurisdiccion, organismo_emisor, referencia, articulos_aplicables, fecha_vigencia_desde, url_fuente, criticidad, requiere_verificacion, sanciones, referencia_sanciones, observaciones",
    )
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });

  if (error) return [];
  const filas = (data ?? []) as any[];
  if (filas.length === 0) return [];

  const ids = filas.map((r) => r.id);

  // Normas (N:M) resueltas en memoria.
  const { data: vinculosNorma } = await supabase
    .from("requisito_legal_norma")
    .select("requisito_legal_id, version_norma_id")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null);

  const versionIds = [
    ...new Set(
      ((vinculosNorma ?? []) as any[]).map((v) => v.version_norma_id).filter(Boolean),
    ),
  ];
  const normaNombrePorVersion = new Map<string, string>();
  if (versionIds.length > 0) {
    const { data: versiones } = await supabase
      .from("versiones_norma")
      .select("id, norma_id")
      .in("id", versionIds);
    const normaIds = [
      ...new Set(((versiones ?? []) as any[]).map((v) => v.norma_id).filter(Boolean)),
    ];
    const nombrePorNorma = new Map<string, string>();
    if (normaIds.length > 0) {
      const { data: normas } = await supabase
        .from("normas")
        .select("id, nombre_corto")
        .in("id", normaIds);
      for (const n of (normas ?? []) as any[]) nombrePorNorma.set(n.id, n.nombre_corto);
    }
    for (const v of (versiones ?? []) as any[]) {
      normaNombrePorVersion.set(v.id, nombrePorNorma.get(v.norma_id) ?? v.id);
    }
  }
  const normasPorReq = new Map<string, Array<{ id: string; nombre: string }>>();
  for (const v of (vinculosNorma ?? []) as any[]) {
    const arr = normasPorReq.get(v.requisito_legal_id) ?? [];
    arr.push({
      id: v.version_norma_id,
      nombre: normaNombrePorVersion.get(v.version_norma_id) ?? v.version_norma_id,
    });
    normasPorReq.set(v.requisito_legal_id, arr);
  }

  // Procesos.
  const { data: vinculosProc } = await supabase
    .from("requisito_legal_proceso")
    .select("requisito_legal_id, proceso_id")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null);
  const procIds = [
    ...new Set(((vinculosProc ?? []) as any[]).map((v) => v.proceso_id).filter(Boolean)),
  ];
  const procCodigo = new Map<string, string>();
  if (procIds.length > 0) {
    const { data: procs } = await supabase
      .from("procesos")
      .select("id, codigo")
      .in("id", procIds);
    for (const p of (procs ?? []) as any[]) procCodigo.set(p.id, p.codigo);
  }
  const procesosPorReq = new Map<string, string[]>();
  for (const v of (vinculosProc ?? []) as any[]) {
    const cod = procCodigo.get(v.proceso_id);
    if (!cod) continue;
    const arr = procesosPorReq.get(v.requisito_legal_id) ?? [];
    arr.push(cod);
    procesosPorReq.set(v.requisito_legal_id, arr);
  }

  // Última evaluación.
  const { data: evals } = await supabase
    .from("evaluaciones_cumplimiento")
    .select("requisito_legal_id, estado, fecha_evaluacion, proxima_evaluacion")
    .in("requisito_legal_id", ids)
    .is("eliminado_en", null)
    .order("fecha_evaluacion", { ascending: false });
  const ultimaEval = new Map<
    string,
    { estado: string; fecha: string; proxima: string | null }
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

  const resultado: Array<FilaExportRequisito & { _normaIds: string[] }> = filas.map(
    (r) => {
      const ev = ultimaEval.get(r.id);
      const normas = normasPorReq.get(r.id) ?? [];
      return {
        codigo: r.codigo,
        titulo: r.titulo,
        tipo: r.tipo,
        categoria: r.categoria,
        jurisdiccion: r.jurisdiccion,
        organismoEmisor: r.organismo_emisor,
        referencia: r.referencia,
        articulosAplicables: r.articulos_aplicables,
        fechaVigenciaDesde: r.fecha_vigencia_desde,
        normas: normas.map((n) => n.nombre).join(", "),
        procesos: (procesosPorReq.get(r.id) ?? []).join(", "),
        criticidad: r.criticidad,
        requiereVerificacion: r.requiere_verificacion === true,
        sanciones: r.sanciones,
        referenciaSanciones: r.referencia_sanciones,
        ultimoEstado: ev?.estado ?? null,
        ultimaEvaluacion: ev?.fecha ?? null,
        proximaEvaluacion: ev?.proxima ?? null,
        urlFuente: r.url_fuente,
        descripcion: r.descripcion,
        observaciones: r.observaciones,
        _normaIds: normas.map((n) => n.id),
      };
    },
  );

  // Mismo filtro que el listado.
  let filtrado = resultado;
  if (filtroVersionNormaId === "__sin__") {
    filtrado = resultado.filter((r) => r._normaIds.length === 0);
  } else if (filtroVersionNormaId) {
    filtrado = resultado.filter((r) => r._normaIds.includes(filtroVersionNormaId));
  }
  return filtrado.map(({ _normaIds, ...fila }) => fila);
}

export async function sugerirCodigoRequisitoLegal(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sugerir_codigo_requisito_legal", {
    p_prefijo: "RL",
  });
  if (error) return null;
  return (data as string) ?? null;
}
