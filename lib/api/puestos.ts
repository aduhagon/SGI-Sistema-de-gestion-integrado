import { createClient } from "@/lib/supabase/server";

export type PuestoDetalle = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  areaNombre: string | null;
};

export type RolEnProceso = {
  id: string;
  procesoId: string;
  procesoCodigo: string;
  procesoNombre: string;
  rol: string;
};

export async function obtenerPuesto(id: string): Promise<PuestoDetalle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("puestos")
    .select("id, codigo, nombre, descripcion, area_id")
    .eq("id", id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (error || !data) return null;

  let areaNombre: string | null = null;
  if (data.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("nombre")
      .eq("id", data.area_id)
      .maybeSingle();
    areaNombre = area?.nombre ?? null;
  }

  return {
    id: data.id,
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    areaNombre,
  };
}

export async function obtenerRolesDePuesto(puestoId: string): Promise<RolEnProceso[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("puesto_proceso_rol")
    .select(
      `id, rol_en_proceso, proceso_id,
       proceso:procesos!puesto_proceso_rol_proceso_id_fkey (codigo, nombre)`,
    )
    .eq("puesto_id", puestoId)
    .eq("activo", true)
    .order("rol_en_proceso", { ascending: true });
  if (error) return [];

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    procesoId: r.proceso_id,
    procesoCodigo: r.proceso?.codigo ?? "—",
    procesoNombre: r.proceso?.nombre ?? "—",
    rol: r.rol_en_proceso,
  }));
}

export async function obtenerProcesosParaSelector(): Promise<
  Array<{ id: string; codigo: string; nombre: string; tipo: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre, tipo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true });
  if (error) return [];
  return (data ?? []) as any[];
}

// ---- Personas del puesto ----
export type PersonaDePuesto = {
  id: string;          // id de persona_puesto
  personaId: string;
  personaNombre: string;
  tieneUsuario: boolean;
  vigenteDesde: string;
};

export async function obtenerPersonasDePuesto(
  puestoId: string,
): Promise<PersonaDePuesto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("persona_puesto")
    .select(
      `id, persona_id, vigente_desde,
       persona:personas!persona_puesto_persona_id_fkey (nombre, apellido)`,
    )
    .eq("puesto_id", puestoId)
    .is("vigente_hasta", null)
    .order("vigente_desde", { ascending: true });
  if (error) return [];

  const filas = (data ?? []) as any[];
  // Marcar quién tiene usuario (para saber si se materializa la participación).
  const personaIds = filas.map((f) => f.persona_id);
  const conUsuario = new Set<string>();
  if (personaIds.length > 0) {
    const { data: us } = await supabase
      .from("usuarios")
      .select("persona_id")
      .in("persona_id", personaIds)
      .eq("activo", true)
      .is("eliminado_en", null);
    for (const u of (us ?? []) as any[]) conUsuario.add(u.persona_id);
  }

  return filas.map((f) => ({
    id: f.id,
    personaId: f.persona_id,
    personaNombre: f.persona
      ? `${f.persona.nombre} ${f.persona.apellido}`.trim()
      : "—",
    tieneUsuario: conUsuario.has(f.persona_id),
    vigenteDesde: f.vigente_desde,
  }));
}

// Personas candidatas para asignar, con su área y gerencia (deducida).
export type PersonaCandidata = {
  id: string;
  nombre: string;
  areaId: string | null;
  areaNombre: string | null;
  gerenciaId: string | null;
  gerenciaNombre: string | null;
};

export async function obtenerPersonasCandidatas(): Promise<PersonaCandidata[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("personas")
    .select("id, nombre, apellido, area_id")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("apellido", { ascending: true });
  if (error) return [];

  const personas = (data ?? []) as any[];

  // Traer áreas para resolver nombre de área y gerencia (área padre).
  const { data: areasData } = await supabase
    .from("areas")
    .select("id, nombre, area_padre_id")
    .eq("activo", true)
    .is("eliminado_en", null);
  const areas = (areasData ?? []) as any[];
  const areaPorId = new Map(areas.map((a) => [a.id, a]));

  return personas.map((p) => {
    const area = p.area_id ? areaPorId.get(p.area_id) : null;
    const gerencia = area?.area_padre_id ? areaPorId.get(area.area_padre_id) : null;
    return {
      id: p.id,
      nombre: `${p.nombre} ${p.apellido}`.trim(),
      areaId: p.area_id ?? null,
      areaNombre: area?.nombre ?? null,
      gerenciaId: gerencia?.id ?? null,
      gerenciaNombre: gerencia?.nombre ?? null,
    };
  });
}

// Gerencias y áreas para los filtros del buscador.
export async function obtenerGerenciasYAreas(): Promise<{
  gerencias: Array<{ id: string; nombre: string }>;
  areas: Array<{ id: string; nombre: string; gerenciaId: string | null }>;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, nombre, codigo, area_padre_id")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("nombre", { ascending: true });
  if (error) return { gerencias: [], areas: [] };

  const todas = (data ?? []) as any[];
  const gerencias = todas
    .filter((a) => a.codigo?.startsWith("GER-"))
    .map((a) => ({ id: a.id, nombre: a.nombre }));
  const areas = todas
    .filter((a) => !a.codigo?.startsWith("GER-"))
    .map((a) => ({ id: a.id, nombre: a.nombre, gerenciaId: a.area_padre_id ?? null }));

  return { gerencias, areas };
}
