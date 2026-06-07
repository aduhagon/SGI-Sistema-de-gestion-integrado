import { createClient } from "@/lib/supabase/server";

export type PersonaResumen = {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string | null;
  cargo: string | null;
  documentoIdentidad: string | null;
  esExterna: boolean;
  areaId: string | null;
  areaNombre: string | null;
  gerenciaNombre: string | null;
  tieneUsuario: boolean;
  activo: boolean;
};

// Lista de personas. Por defecto solo activas (sin fecha de baja).
export async function listarPersonas(incluirInactivas = false): Promise<PersonaResumen[]> {
  const supabase = createClient();
  let query = supabase
    .from("personas")
    .select("id, nombre, apellido, email, cargo, documento_identidad, es_externa, area_id, activo, eliminado_en")
    .order("apellido", { ascending: true });

  if (!incluirInactivas) {
    query = query.eq("activo", true).is("eliminado_en", null);
  }

  const { data, error } = await query;
  if (error) return [];

  const personas = (data ?? []) as any[];

  // Resolver área y gerencia en memoria.
  const { data: areasData } = await supabase
    .from("areas")
    .select("id, nombre, area_padre_id");
  const areas = (areasData ?? []) as any[];
  const areaPorId = new Map(areas.map((a) => [a.id, a]));

  // Marcar quién tiene usuario.
  const ids = personas.map((p) => p.id);
  const conUsuario = new Set<string>();
  if (ids.length > 0) {
    const { data: us } = await supabase
      .from("usuarios")
      .select("persona_id")
      .in("persona_id", ids)
      .eq("activo", true)
      .is("eliminado_en", null);
    for (const u of (us ?? []) as any[]) conUsuario.add(u.persona_id);
  }

  return personas.map((p) => {
    const area = p.area_id ? areaPorId.get(p.area_id) : null;
    const gerencia = area?.area_padre_id ? areaPorId.get(area.area_padre_id) : null;
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      nombreCompleto: `${p.nombre} ${p.apellido}`.trim(),
      email: p.email,
      cargo: p.cargo,
      documentoIdentidad: p.documento_identidad,
      esExterna: p.es_externa,
      areaId: p.area_id,
      areaNombre: area?.nombre ?? null,
      gerenciaNombre: gerencia?.nombre ?? null,
      tieneUsuario: conUsuario.has(p.id),
      activo: p.activo && !p.eliminado_en,
    };
  });
}

export async function obtenerPersona(id: string): Promise<PersonaResumen | null> {
  const todas = await listarPersonas(true);
  return todas.find((p) => p.id === id) ?? null;
}

// Historial de puestos de una persona (vigentes e históricos).
export type PuestoHistorial = {
  id: string;
  puestoNombre: string;
  puestoCodigo: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  motivoAsignacion: string | null;
  motivoRevocacion: string | null;
};

export async function obtenerHistorialPuestos(
  personaId: string,
): Promise<PuestoHistorial[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("persona_puesto")
    .select(
      `id, vigente_desde, vigente_hasta, motivo_asignacion, motivo_revocacion,
       puesto:puestos!persona_puesto_puesto_id_fkey (codigo, nombre)`,
    )
    .eq("persona_id", personaId)
    .order("vigente_desde", { ascending: false });
  if (error) return [];

  return ((data ?? []) as any[]).map((h) => ({
    id: h.id,
    puestoNombre: h.puesto?.nombre ?? "—",
    puestoCodigo: h.puesto?.codigo ?? "—",
    vigenteDesde: h.vigente_desde,
    vigenteHasta: h.vigente_hasta,
    motivoAsignacion: h.motivo_asignacion,
    motivoRevocacion: h.motivo_revocacion,
  }));
}
