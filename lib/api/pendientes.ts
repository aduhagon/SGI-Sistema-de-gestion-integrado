import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { listarRequisitosLegales } from "@/lib/api/requisitos-legales";
import { obtenerConfiguracion } from "@/lib/api/config-sistema";

export type NivelPendiente = "recordatorio" | "advertencia" | "vencido_hoy" | "vencido";

export type Pendiente = {
  modulo: string;
  entidadId: string;
  codigo: string;
  titulo: string;
  fechaLimite: string | null;
  diasRestantes: number | null;
  nivel: NivelPendiente;
  urlDestino: string;
  motivo?: string | null;
};

export type GrupoPendientes = {
  modulo: string;
  label: string;
  items: Pendiente[];
};

export type ResponsablePendientesSistema = {
  usuarioId: string | null;
  responsable: string;
  username: string | null;
  total: number;
  vencidos: number;
  vencenHoy: number;
  proximos: number;
  modulos: string[];
  primerUrl: string | null;
};

export type ResponsablePendienteDetalleSistema = {
  usuarioId: string | null;
  responsable: string;
  username: string | null;
  modulo: string;
  moduloLabel: string;
  entidadId: string;
  codigo: string;
  titulo: string;
  fechaLimite: string | null;
  diasRestantes: number | null;
  nivel: NivelPendiente;
  urlDestino: string;
};

export type EstadoSeguimientoPendiente = "sin_revisar" | "en_curso" | "bloqueado" | "contactado";

export type SeguimientoPendienteGerencial = {
  modulo: string;
  entidadId: string;
  responsableClave: string;
  responsableNombre: string;
  estado: EstadoSeguimientoPendiente;
  nota: string | null;
  actualizadoEn: string;
  actualizadoPor: string | null;
};

const MODULO_LABEL: Record<string, string> = {
  aprobaciones: "Aprobaciones de documentos",
  acuses: "Acuses de lectura",
  no_conformidades: "No conformidades",
  acciones: "Acciones de tratamiento",
  hallazgos: "Hallazgos por tratar",
  auditorias: "Auditorías programadas",
  riesgos: "Riesgos",
  indicadores: "Indicadores por medir",
  documentos: "Documentos por revisar",
  controles: "Controles por ejecutar",
  controles_observados: "Resultados de controles por tratar",
  requisitos_legales: "Requisitos legales por evaluar",
  asignaciones_legales: "Responsables legales por configurar",
  documentacion: "Cambios documentales y lecturas",
  tratamiento: "Tratamientos por planificar",
  verificaciones: "Verificaciones de eficacia",
  cierres: "No conformidades listas para cerrar",
};

// Orden de presentación de las secciones en la pantalla.
//
// Los módulos nuevos se agregan al final, sin perder sus tareas.
const ORDEN_MODULO = [
  "aprobaciones",
  "acuses",
  "no_conformidades",
  "acciones",
  "hallazgos",
  "auditorias",
  "controles",
  "requisitos_legales",
  "controles_observados",
  "documentacion",
  "tratamiento",
  "verificaciones",
  "cierres",
  "riesgos",
  "indicadores",
  "documentos",
];

const SECCION_POR_MODULO: Record<string, string> = {
  no_conformidades: "descripcion",
  tratamiento: "tratamiento",
  acciones: "acciones",
  verificaciones: "eficacia",
  cierres: "cierre",
};

function destinoAccion(modulo: string, url: string, entidadId: string): string {
  if (modulo === "aprobaciones") return `/aprobaciones?resolver=${entidadId}`;
  if (modulo === "acuses") return `/acuses?firmar=${entidadId}`;
  if (modulo === "hallazgos" && url.startsWith("/auditorias/")) {
    return `${url.split("#")[0]}#hallazgo-${entidadId}`;
  }
  if (modulo === "auditorias" && url.startsWith("/auditorias/")) {
    return `${url.split("#")[0]}#acciones-auditoria`;
  }
  if (modulo === "controles_observados" && url.startsWith("/controles/")) {
    return `${url.split("#")[0]}#ejecucion-${entidadId}`;
  }
  const seccion = SECCION_POR_MODULO[modulo];
  if (!seccion || !url.startsWith("/ncs/")) return url;
  return `${url.split("#")[0]}#${seccion}`;
}

function motivoPorPuesto(prefijo: string, puesto?: string | null): string | null {
  const nombre = puesto?.trim();
  return nombre ? `${prefijo}: ${nombre}.` : null;
}

function motivoPorFilaPendiente(modulo: string, titulo: string): string | null {
  switch (modulo) {
    case "aprobaciones":
      return "Asignado por aprobación documental pendiente.";
    case "acuses":
      return "Asignado por lectura obligatoria del documento vigente.";
    case "acciones":
      return "Asignado por responsabilidad o participación en la acción.";
    case "hallazgos":
      return "Asignado por tratamiento de hallazgo de auditoría.";
    case "auditorias":
      return "Asignado por responsabilidad en la auditoría programada.";
    case "tratamiento":
      return titulo.startsWith("Planificar tratamiento:")
        ? "Asignado por gestión SGI o tratamiento pendiente de planificar."
        : "Asignado por responsabilidad de tratamiento: completar causa, acciones o eficacia.";
    case "verificaciones":
      return "Asignado por verificación independiente de eficacia.";
    case "cierres":
      return "Asignado por responsabilidad de tratamiento: eficacia verificada y cierre disponible.";
    case "documentacion":
      return "Asignado por cambio documental pendiente dentro del tratamiento.";
    case "controles_observados":
      return "Asignado por gestión del control observado o del proceso vinculado.";
    default:
      return null;
  }
}

const MODULOS_MEJORA_NC = new Set(["tratamiento", "verificaciones", "cierres", "documentacion"]);

function nombreUsuario(usuario: any): string | null {
  if (!usuario) return null;
  const persona = usuario.personas ?? usuario.persona;
  const nombre = persona ? `${persona.nombre ?? ""} ${persona.apellido ?? ""}`.trim() : "";
  return nombre || usuario.username || null;
}

function agregarProceso(motivo: string, proceso?: { nombre?: string | null } | null): string {
  const nombre = proceso?.nombre?.trim();
  return nombre ? `${motivo} Proceso: ${nombre}.` : motivo;
}

function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function documentoVersion(codigo?: string | null, numeroVersion?: string | null): string {
  const base = codigo?.trim() || "Documento";
  const version = numeroVersion?.trim();
  return version ? `${base} v${version}` : base;
}

async function enriquecerMotivosDocumentales(
  supabase: ReturnType<typeof createClient>,
  usuarioId: string,
  items: Pendiente[],
): Promise<void> {
  const aprobacionIds = Array.from(new Set(
    items
      .filter((item) => item.modulo === "aprobaciones")
      .map((item) => item.entidadId),
  ));
  const acuseIds = Array.from(new Set(
    items
      .filter((item) => item.modulo === "acuses")
      .map((item) => item.entidadId),
  ));

  try {
    if (aprobacionIds.length > 0) {
      const { data, error } = await supabase
        .from("aprobaciones")
        .select(`
          id,
          aprobador_n1_id,
          aprobador_n2_id,
          decision_n1,
          decision_n2,
          versiones:versiones!aprobaciones_version_id_fkey (
            numero_version,
            documentos:documentos!versiones_documento_id_fkey (
              codigo,
              titulo,
              tipos_documentales (codigo, nombre),
              procesos:procesos!documentos_proceso_principal_id_fkey (codigo, nombre)
            )
          )
        `)
        .in("id", aprobacionIds)
        .or(`aprobador_n1_id.eq.${usuarioId},aprobador_n2_id.eq.${usuarioId}`);

      if (error) console.error("[SGI:pendientes] motivos aprobaciones", error);
      else {
        const aprobacionesPorId = new Map<string, any>();
        for (const aprobacion of (data ?? []) as any[]) aprobacionesPorId.set(aprobacion.id, aprobacion);

        for (const item of items.filter((pendiente) => pendiente.modulo === "aprobaciones")) {
          const aprobacion = aprobacionesPorId.get(item.entidadId);
          if (!aprobacion) continue;

          const version = primero<any>(aprobacion.versiones);
          const documento = primero<any>(version?.documentos);
          const tipo = primero<any>(documento?.tipos_documentales);
          const proceso = primero<any>(documento?.procesos);
          const nivel = aprobacion.aprobador_n1_id === usuarioId && aprobacion.decision_n1 === "pendiente"
            ? 1
            : 2;
          const nombreDocumento = documentoVersion(documento?.codigo ?? item.codigo, version?.numero_version);
          const tipoTexto = tipo?.nombre ? ` (${tipo.nombre})` : "";

          item.motivo = agregarProceso(
            `Asignado como aprobador documental de nivel ${nivel}: ${nombreDocumento}${tipoTexto}.`,
            proceso,
          );
        }
      }
    }

    if (acuseIds.length > 0) {
      const { data, error } = await supabase
        .from("acuses_lectura")
        .select(`
          id,
          versiones:versiones!acuses_lectura_version_id_fkey (
            numero_version,
            documentos:documentos!versiones_documento_id_fkey (
              codigo,
              titulo,
              tipos_documentales (codigo, nombre),
              procesos:procesos!documentos_proceso_principal_id_fkey (codigo, nombre)
            )
          )
        `)
        .in("id", acuseIds)
        .eq("usuario_id", usuarioId);

      if (error) console.error("[SGI:pendientes] motivos acuses", error);
      else {
        const acusesPorId = new Map<string, any>();
        for (const acuse of (data ?? []) as any[]) acusesPorId.set(acuse.id, acuse);

        for (const item of items.filter((pendiente) => pendiente.modulo === "acuses")) {
          const acuse = acusesPorId.get(item.entidadId);
          if (!acuse) continue;

          const version = primero<any>(acuse.versiones);
          const documento = primero<any>(version?.documentos);
          const tipo = primero<any>(documento?.tipos_documentales);
          const proceso = primero<any>(documento?.procesos);
          const nombreDocumento = documentoVersion(documento?.codigo ?? item.codigo, version?.numero_version);
          const tipoTexto = tipo?.nombre ? ` (${tipo.nombre})` : "";

          item.motivo = agregarProceso(
            `Asignado como destinatario de lectura: ${nombreDocumento}${tipoTexto}.`,
            proceso,
          );
        }
      }
    }
  } catch (error) {
    console.error("[SGI:pendientes] enriquecimiento de motivos documentales", error);
  }
}

async function enriquecerMotivosMejora(
  supabase: ReturnType<typeof createClient>,
  items: Pendiente[],
): Promise<void> {
  const ncIds = Array.from(new Set(
    items
      .filter((item) => MODULOS_MEJORA_NC.has(item.modulo))
      .map((item) => item.entidadId),
  ));
  const accionIds = Array.from(new Set(
    items
      .filter((item) => item.modulo === "acciones")
      .map((item) => item.entidadId),
  ));

  try {
    const ncsPorId = new Map<string, any>();
    const accionesDocumentalesPorNc = new Map<string, any>();
    const accionesPorId = new Map<string, any>();

    if (ncIds.length > 0) {
      const [{ data: ncs, error: errorNcs }, { data: accionesDocumentales, error: errorAccionesDocumentales }] = await Promise.all([
        supabase
          .from("no_conformidades")
          .select(`
            id, responsable_tratamiento_id, verificador_eficacia_id,
            proceso:procesos!no_conformidades_proceso_id_fkey(nombre),
            responsable:usuarios!no_conformidades_responsable_tratamiento_id_fkey(
              username, personas:personas!usuarios_persona_id_fkey(nombre, apellido)
            ),
            verificador:usuarios!no_conformidades_verificador_eficacia_id_fkey(
              username, personas:personas!usuarios_persona_id_fkey(nombre, apellido)
            )
          `)
          .in("id", ncIds),
        supabase
          .from("acciones")
          .select(`
            id, codigo, titulo, no_conformidad_id, fecha_limite,
            responsable:usuarios!acciones_responsable_id_fkey(
              username, personas:personas!usuarios_persona_id_fkey(nombre, apellido)
            )
          `)
          .in("no_conformidad_id", ncIds)
          .eq("requiere_cambio_documental", true)
          .neq("estado", "cancelada")
          .eq("activo", true)
          .is("eliminado_en", null)
          .order("fecha_limite", { ascending: true }),
      ]);

      if (errorNcs) console.error("[SGI:pendientes] motivos mejora NC", errorNcs);
      else for (const nc of (ncs ?? []) as any[]) ncsPorId.set(nc.id, nc);

      if (errorAccionesDocumentales) console.error("[SGI:pendientes] motivos mejora documentacion", errorAccionesDocumentales);
      else {
        for (const accion of (accionesDocumentales ?? []) as any[]) {
          if (!accionesDocumentalesPorNc.has(accion.no_conformidad_id)) {
            accionesDocumentalesPorNc.set(accion.no_conformidad_id, accion);
          }
        }
      }
    }

    if (accionIds.length > 0) {
      const { data: acciones, error } = await supabase
        .from("acciones")
        .select(`
          id, codigo, titulo, no_conformidad_id,
          responsable:usuarios!acciones_responsable_id_fkey(
            username, personas:personas!usuarios_persona_id_fkey(nombre, apellido)
          )
        `)
        .in("id", accionIds)
        .eq("activo", true)
        .is("eliminado_en", null);

      if (error) console.error("[SGI:pendientes] motivos acciones", error);
      else for (const accion of (acciones ?? []) as any[]) accionesPorId.set(accion.id, accion);
    }

    for (const item of items) {
      if (MODULOS_MEJORA_NC.has(item.modulo)) {
        const nc = ncsPorId.get(item.entidadId);
        if (!nc) continue;
        const responsable = nombreUsuario(nc.responsable);
        const verificador = nombreUsuario(nc.verificador);

        if (item.modulo === "tratamiento") {
          item.motivo = responsable
            ? agregarProceso(`Asignado como responsable de tratamiento: ${responsable}.`, nc.proceso)
            : agregarProceso("Asignado por gestión SGI: tratamiento sin responsable o planificación completa.", nc.proceso);
        } else if (item.modulo === "verificaciones") {
          item.motivo = verificador
            ? agregarProceso(`Asignado como verificador independiente: ${verificador}.`, nc.proceso)
            : agregarProceso("Asignado por verificación independiente pendiente.", nc.proceso);
        } else if (item.modulo === "cierres") {
          item.motivo = responsable
            ? agregarProceso(`Asignado como responsable de tratamiento: eficacia verificada y cierre disponible para ${responsable}.`, nc.proceso)
            : agregarProceso("Asignado por cierre disponible tras eficacia verificada.", nc.proceso);
        } else if (item.modulo === "documentacion") {
          const accion = accionesDocumentalesPorNc.get(item.entidadId);
          const responsableAccion = nombreUsuario(accion?.responsable);
          item.motivo = accion
            ? `Asignado por cambio documental de la acción ${accion.codigo}${responsableAccion ? `; responsable: ${responsableAccion}` : ""}.`
            : agregarProceso("Asignado por cambio documental pendiente dentro del tratamiento.", nc.proceso);
        }
      } else if (item.modulo === "acciones") {
        const accion = accionesPorId.get(item.entidadId);
        if (!accion) continue;
        const responsable = nombreUsuario(accion.responsable);
        item.motivo = `Asignado por acción de tratamiento ${accion.codigo}${responsable ? `; responsable: ${responsable}` : ""}.`;
      }
    }
  } catch (error) {
    console.error("[SGI:pendientes] enriquecimiento de motivos", error);
  }
}





export async function obtenerSeguimientosPendientesGerenciales(): Promise<SeguimientoPendienteGerencial[] | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("fn_seguimientos_pendientes_gerencial");
  if (error) {
    const mensaje = error.message ?? "";
    const codigo = error.code ?? "";
    const sinPermiso = ["42501", "P0001", "PGRST202"].includes(codigo)
      || /Solo un administrador|responsable del SGI|permission denied|Could not find/i.test(mensaje);

    if (!sinPermiso) console.error("[SGI:pendientes] seguimientos gerenciales", error);
    return null;
  }

  return ((data ?? []) as Array<{
    modulo: string;
    entidad_id: string;
    responsable_clave: string;
    responsable_nombre: string;
    estado: EstadoSeguimientoPendiente;
    nota: string | null;
    actualizado_en: string;
    actualizado_por: string | null;
  }>).map((fila) => ({
    modulo: fila.modulo,
    entidadId: fila.entidad_id,
    responsableClave: fila.responsable_clave,
    responsableNombre: fila.responsable_nombre,
    estado: fila.estado,
    nota: fila.nota,
    actualizadoEn: fila.actualizado_en,
    actualizadoPor: fila.actualizado_por,
  }));
}

export async function obtenerDetalleTableroPendientesResponsables(): Promise<ResponsablePendienteDetalleSistema[] | null> {
  const supabase = createClient();
  const zona = await obtenerZonaHoraria();

  const { data, error } = await supabase.rpc("fn_tablero_pendientes_responsables_detalle", {
    p_zona: zona,
    p_usuario_id: null,
  });

  if (error) {
    const mensaje = error.message ?? "";
    const codigo = error.code ?? "";
    const sinPermiso = ["42501", "P0001", "PGRST202"].includes(codigo)
      || /Solo un administrador|responsable del SGI|permission denied|Could not find/i.test(mensaje);

    if (!sinPermiso) console.error("[SGI:pendientes] detalle tablero responsables", error);
    return null;
  }

  return ((data ?? []) as Array<{
    usuario_id: string | null;
    responsable: string | null;
    username: string | null;
    modulo: string | null;
    entidad_id: string;
    codigo: string | null;
    titulo: string | null;
    fecha_limite: string | null;
    dias_restantes: number | null;
    nivel: NivelPendiente | null;
    url_destino: string | null;
  }>).filter((fila) => fila.nivel !== null && fila.modulo !== null && fila.url_destino !== null).map((fila) => ({
    usuarioId: fila.usuario_id ?? null,
    responsable: fila.responsable ?? "Sin responsable",
    username: fila.username ?? null,
    modulo: fila.modulo ?? "otros",
    moduloLabel: MODULO_LABEL[fila.modulo ?? ""] ?? (fila.modulo ?? "Otras tareas").replace(/_/g, " "),
    entidadId: fila.entidad_id,
    codigo: fila.codigo ?? "PEND",
    titulo: fila.titulo ?? "Pendiente sin titulo",
    fechaLimite: fila.fecha_limite ?? null,
    diasRestantes: fila.dias_restantes ?? null,
    nivel: fila.nivel as NivelPendiente,
    urlDestino: destinoAccion(fila.modulo ?? "", fila.url_destino ?? "#", fila.entidad_id),
  }));
}

export async function obtenerTableroPendientesResponsables(): Promise<ResponsablePendientesSistema[] | null> {
  const supabase = createClient();
  const zona = await obtenerZonaHoraria();

  const { data, error } = await supabase.rpc("fn_tablero_pendientes_responsables", { p_zona: zona });
  if (error) {
    const mensaje = error.message ?? "";
    const codigo = error.code ?? "";
    const sinPermiso = ["42501", "P0001", "PGRST202"].includes(codigo)
      || /Solo un administrador|responsable del SGI|permission denied|Could not find/i.test(mensaje);

    if (!sinPermiso) console.error("[SGI:pendientes] tablero responsables", error);
    return null;
  }

  return ((data ?? []) as Array<{
    usuario_id: string | null;
    responsable: string | null;
    username: string | null;
    total: number | string | null;
    vencidos: number | string | null;
    vencen_hoy: number | string | null;
    proximos: number | string | null;
    modulos: string[] | null;
    primer_url: string | null;
  }>).map((fila) => ({
    usuarioId: fila.usuario_id ?? null,
    responsable: fila.responsable ?? "Sin responsable",
    username: fila.username ?? null,
    total: Number(fila.total ?? 0),
    vencidos: Number(fila.vencidos ?? 0),
    vencenHoy: Number(fila.vencen_hoy ?? 0),
    proximos: Number(fila.proximos ?? 0),
    modulos: Array.isArray(fila.modulos) ? fila.modulos : [],
    primerUrl: fila.primer_url ?? null,
  }));
}

/**
 * Devuelve los pendientes del usuario actual, agrupados por módulo.
 * La función fn_pendientes_usuario ya calcula el nivel de escalamiento
 * (recordatorio/advertencia/vencido_hoy/vencido) usando la zona del sistema.
 */
export async function obtenerMisPendientes(): Promise<GrupoPendientes[]> {
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) throw new Error("No se pudo identificar al usuario para consultar sus pendientes. Volvé a iniciar sesión.");

  const supabase = createClient();
  const zona = await obtenerZonaHoraria();

  const [{ data, error }, mejora] = await Promise.all([
    supabase.rpc("fn_pendientes_usuario", { p_usuario_id: usuarioId, p_zona: zona }),
    supabase.rpc("fn_pendientes_mejora", { p_zona: zona }),
  ]);
  if (mejora.error) throw new Error(`No se pudieron cargar los pendientes de mejora: ${mejora.error.message}`);

  if (error) {
    console.error("[SGI:pendientes] obtenerMisPendientes", error);
    throw new Error("No se pudo cargar la bandeja completa de pendientes. Actualizá para volver a consultar; tus tareas se conservan.");
  }

  const mejoraFilas = mejora.data ?? [];
  const ncsConEtapa = new Set(mejoraFilas.filter((f: { modulo: string }) => ["tratamiento", "cierres"].includes(f.modulo)).map((f: { entidad_id: string }) => f.entidad_id));
  const filas = [...(data ?? []).filter((f: { modulo: string; entidad_id: string }) => f.modulo !== "no_conformidades" || !ncsConEtapa.has(f.entidad_id)), ...mejoraFilas] as Array<{
    modulo: string;
    entidad_id: string;
    codigo: string;
    titulo: string;
    fecha_limite: string | null;
    dias_restantes: number | null;
    nivel: NivelPendiente | null;
    url_destino: string;
  }>;

  // La función puede devolver nivel NULL para ítems fuera de ventana
  // (caso borde); los descartamos.
  const items: Pendiente[] = filas
    .filter((f) => f.nivel !== null)
    .map((f) => ({
      modulo: f.modulo,
      entidadId: f.entidad_id,
      codigo: f.codigo,
      titulo: f.titulo,
      fechaLimite: f.fecha_limite,
      diasRestantes: f.dias_restantes,
      nivel: f.nivel as NivelPendiente,
      urlDestino: destinoAccion(f.modulo, f.url_destino, f.entidad_id),
      motivo: motivoPorFilaPendiente(f.modulo, f.titulo),
    }));

  await enriquecerMotivosDocumentales(supabase, usuarioId, items);
  await enriquecerMotivosMejora(supabase, items);

  items.push(...(await obtenerPendientesControles(supabase, usuarioId, zona)));
  const config = await obtenerConfiguracion();
  items.push(...(await obtenerPendientesRequisitosLegales(supabase, zona, config.requisitosAlertaDias)));

  // Agrupar por módulo respetando el orden de presentación.
  const grupos: GrupoPendientes[] = [];
  const modulos = [...ORDEN_MODULO, ...Array.from(new Set(items.map((item) => item.modulo))).filter((modulo) => !ORDEN_MODULO.includes(modulo))];
  for (const modulo of modulos) {
    const delModulo = items.filter((i) => i.modulo === modulo);
    if (delModulo.length > 0) {
      grupos.push({
        modulo,
        label: MODULO_LABEL[modulo] ?? `Otras tareas · ${modulo.replace(/_/g, " ")}`,
        items: delModulo,
      });
    }
  }

  return grupos;
}

async function obtenerPendientesRequisitosLegales(supabase: ReturnType<typeof createClient>, zona: string, anticipacionDias: number): Promise<Pendiente[]> {
  const requisitos = await listarRequisitosLegales(undefined, true);
  const { data: contexto, error } = await supabase.rpc("fn_contexto_responsables_legales");
  if (error || !contexto) throw new Error("No se pudo verificar la asignación de los requisitos legales. Actualizá la bandeja.");
  const resultado = contexto as { gestion: boolean; requisitos: Array<{ id: string; esResponsable: boolean; estado: string; puestoNombre: string | null }> };
  const asignaciones = new Map(resultado.requisitos.map((r) => [r.id, r]));
  const hoy = fechaCalendarioEnZona(zona);
  const propios = requisitos.filter((r) => asignaciones.get(r.id)?.esResponsable);
  const sinEvaluacion = propios.filter((requisito) => !requisito.ultimaEvaluacion);
  const pendientes: Pendiente[] = [];

  const sinResponsable = requisitos.filter((r) => asignaciones.get(r.id)?.estado !== "asignado");
  if (resultado.gestion && sinResponsable.length > 0) {
    pendientes.push({
      modulo: "asignaciones_legales",
      entidadId: "sin-responsable-operativo",
      codigo: "LEGAL",
      titulo: `${sinResponsable.length} requisitos sin responsable operativo: asigná un puesto o revisá sus ocupantes y accesos`,
      fechaLimite: null,
      diasRestantes: null,
      nivel: "advertencia",
      urlDestino: "/requisitos-legales",
      motivo: "Asignado por rol de gestión SGI/legal.",
    });
  }

  for (const requisito of sinEvaluacion) {
    const asignacion = asignaciones.get(requisito.id);
    pendientes.push({
      modulo: "requisitos_legales", entidadId: requisito.id, codigo: requisito.codigo,
      titulo: `${requisito.titulo} · Evaluación inicial`, fechaLimite: null, diasRestantes: null,
      nivel: ["alto", "critico"].includes(requisito.criticidad ?? "") ? "advertencia" : "recordatorio",
      urlDestino: `/requisitos-legales?evaluar=${requisito.id}`,
      motivo: motivoPorPuesto("Asignado por tu puesto vigente", asignacion?.puestoNombre),
    });
  }

  for (const requisito of propios) {
    if (!requisito.ultimaEvaluacion || !requisito.proximaEvaluacion) continue;
    const diasRestantes = diferenciaDias(hoy, requisito.proximaEvaluacion);
    if (diasRestantes > anticipacionDias) continue;
    const asignacion = asignaciones.get(requisito.id);
    pendientes.push({
      modulo: "requisitos_legales",
      entidadId: requisito.id,
      codigo: requisito.codigo,
      titulo: requisito.titulo,
      fechaLimite: requisito.proximaEvaluacion,
      diasRestantes,
      nivel: diasRestantes < 0 ? "vencido" : diasRestantes === 0 ? "vencido_hoy" : diasRestantes <= Math.max(1, Math.ceil(anticipacionDias / 2)) ? "advertencia" : "recordatorio",
      urlDestino: `/requisitos-legales?evaluar=${requisito.id}`,
      motivo: motivoPorPuesto("Asignado por tu puesto vigente", asignacion?.puestoNombre),
    });
  }
  return pendientes;
}

async function obtenerPendientesControles(
  supabase: ReturnType<typeof createClient>,
  usuarioId: string,
  zona: string,
): Promise<Pendiente[]> {
  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("persona_id")
    .eq("id", usuarioId)
    .eq("activo", true)
    .maybeSingle();
  if (errorUsuario) throw new Error("No se pudo consultar el perfil responsable de controles. Actualizá la bandeja; tus tareas se conservan.");
  if (!usuario?.persona_id) return [];

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from("persona_puesto")
    .select("puesto_id")
    .eq("persona_id", usuario.persona_id)
    .is("vigente_hasta", null);
  if (errorAsignaciones) throw new Error("No se pudieron consultar los puestos responsables de controles. Actualizá la bandeja; tus tareas se conservan.");

  const puestos = Array.from(new Set((asignaciones ?? []).map((fila) => fila.puesto_id)));
  if (puestos.length === 0) return [];

  const { data, error } = await supabase
    .from("controles")
    .select(
      `id, codigo, nombre, responsable_puesto_id, proxima_ejecucion, anticipacion_dias,
       proceso:procesos!controles_proceso_id_fkey (codigo, nombre),
       responsable:puestos!controles_responsable_puesto_id_fkey (nombre)`,
    )
    .in("responsable_puesto_id", puestos)
    .eq("estado", "activo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .not("proxima_ejecucion", "is", null)
    .order("proxima_ejecucion");
  if (error) {
    console.error("[SGI:pendientes] controles", error);
    throw new Error("No se pudieron consultar los controles pendientes. Actualizá la bandeja; tus tareas se conservan.");
  }

  const hoy = fechaCalendarioEnZona(zona);
  const pendientes: Pendiente[] = [];
  for (const control of (data ?? []) as any[]) {
    const diasRestantes = diferenciaDias(hoy, control.proxima_ejecucion);
    if (diasRestantes > control.anticipacion_dias) continue;
    const nivel: NivelPendiente = diasRestantes < 0
      ? "vencido"
      : diasRestantes === 0
        ? "vencido_hoy"
        : diasRestantes <= Math.max(1, Math.ceil(control.anticipacion_dias / 2))
          ? "advertencia"
          : "recordatorio";
    pendientes.push({
      modulo: "controles",
      entidadId: control.id,
      codigo: control.codigo,
      titulo: `${control.nombre} · ${control.proceso?.nombre ?? "Proceso"}`,
      fechaLimite: control.proxima_ejecucion,
      diasRestantes,
      nivel,
      urlDestino: `/controles/${control.id}/ejecuciones`,
      motivo: motivoPorPuesto("Asignado por puesto responsable vigente", control.responsable?.nombre),
    });
  }
  return pendientes;
}

function fechaCalendarioEnZona(zona: string): string {
  const partes = new Intl.DateTimeFormat("en", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function diferenciaDias(desde: string, hasta: string): number {
  const aNumero = (fecha: string) => {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return Date.UTC(anio, mes - 1, dia);
  };
  return Math.round((aNumero(hasta) - aNumero(desde)) / 86_400_000);
}
