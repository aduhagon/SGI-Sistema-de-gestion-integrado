import { createClient } from "@/lib/supabase/server";

// "Observación" en sentido de auditoría: hallazgo de tipo observacion u
// oportunidad_mejora, que recibe seguimiento simple (sin ciclo CAPA).
// Las NC formales viven en no_conformidades; acá no se mezclan.
const TIPOS_OBSERVACION = ["observacion", "oportunidad_mejora"];

export type ObservacionLista = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  severidad: string | null;
  estado: string;
  procesoNombre: string | null;
  responsableNombre: string | null;
  fechaLimite: string | null;
  detectadoEn: string;
};

export type ObservacionDetalle = ObservacionLista & {
  descripcion: string;
  evidencia: string | null;
  accionTratamiento: string | null;
  motivoCierre: string | null;
  fechaCierreReal: string | null;
  responsableId: string | null;
  requisitoClausula: string | null;
  auditoriaId: string | null;
};

const SELECT_LISTA = `
  id, codigo, titulo, tipo, severidad, estado, fecha_limite, detectado_en,
  procesos:procesos!hallazgos_proceso_id_fkey (nombre),
  responsable:puestos!hallazgos_responsable_tratamiento_id_fkey (nombre)
`;

function mapLista(h: any): ObservacionLista {
  return {
    id: h.id,
    codigo: h.codigo,
    titulo: h.titulo,
    tipo: h.tipo,
    severidad: h.severidad ?? null,
    estado: h.estado,
    procesoNombre: h.procesos?.nombre ?? null,
    responsableNombre: h.responsable?.nombre ?? null,
    fechaLimite: h.fecha_limite ?? null,
    detectadoEn: h.detectado_en,
  };
}

export async function obtenerObservaciones(): Promise<ObservacionLista[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hallazgos")
    .select(SELECT_LISTA)
    .in("tipo", TIPOS_OBSERVACION)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("detectado_en", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las observaciones: ${error.message}`);
  return ((data ?? []) as any[]).map(mapLista);
}

export async function obtenerObservacionDetalle(id: string): Promise<ObservacionDetalle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hallazgos")
    .select(
      `${SELECT_LISTA}, descripcion, evidencia, accion_tratamiento, motivo_cierre,
       fecha_cierre_real, responsable_tratamiento_id, auditoria_id,
       requisitos:requisitos!hallazgos_requisito_id_fkey (clausula)`,
    )
    .eq("id", id)
    .in("tipo", TIPOS_OBSERVACION)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !data) return null;
  const h = data as any;
  return {
    ...mapLista(h),
    descripcion: h.descripcion,
    evidencia: h.evidencia ?? null,
    accionTratamiento: h.accion_tratamiento ?? null,
    motivoCierre: h.motivo_cierre ?? null,
    fechaCierreReal: h.fecha_cierre_real ?? null,
    responsableId: h.responsable_tratamiento_id ?? null,
    requisitoClausula: h.requisitos?.clausula ?? null,
    auditoriaId: h.auditoria_id ?? null,
  };
}

export type PuestoOpcion = { id: string; nombre: string };

/** Puestos activos, para el desplegable de responsable de tratamiento. */
export async function obtenerPuestosParaObservacion(): Promise<PuestoOpcion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("puestos")
    .select("id, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("nombre");
  return ((data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre }));
}

/** Conteo de observaciones abiertas/en tratamiento, para el badge de la pestaña. */
export async function contarObservacionesPendientes(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("hallazgos")
    .select("id", { count: "exact", head: true })
    .in("tipo", TIPOS_OBSERVACION)
    .in("estado", ["abierto", "en_tratamiento"])
    .eq("activo", true)
    .is("eliminado_en", null);
  if (error) return 0;
  return count ?? 0;
}
