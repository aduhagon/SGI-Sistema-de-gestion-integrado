import { createClient } from "@/lib/supabase/server";

export type Participacion = {
  // Identificador estable para React keys. Como la participación es derivada
  // (no hay fila propia), se compone de persona + rol.
  id: string;
  personaId: string;
  usuarioId: string | null;
  usuarioNombre: string;
  rol: string;
  puestoCodigo: string;
  puestoNombre: string;
};

// Participantes de un proceso, DERIVADOS de la cadena puesto:
//   puesto_proceso_rol (activo) -> persona_puesto (vigente) -> personas
// Ya no se lee participacion_usuario_proceso (tabla histórica sin gobierno).
export async function obtenerParticipacionesDeProceso(
  procesoId: string,
): Promise<Participacion[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_participantes_de_proceso", {
    p_proceso_id: procesoId,
  });

  if (error) return [];

  return ((data ?? []) as any[]).map((p) => ({
    id: `${p.persona_id}:${p.rol}`,
    personaId: p.persona_id,
    usuarioId: p.usuario_id ?? null,
    usuarioNombre: p.nombre_completo || "—",
    rol: p.rol,
    puestoCodigo: p.puesto_codigo ?? "",
    puestoNombre: p.puesto_nombre ?? "",
  }));
}

// Vista global de consulta: todas las participaciones vigentes del sistema,
// derivadas de la cadena puesto. Usada en Configuración → Participación.
export type ParticipacionGlobal = {
  id: string;
  usuarioNombre: string;
  procesoId: string;
  procesoNombre: string;
  procesoTipo: string;
  rol: string;
};

export async function listarParticipacionesVigentes(): Promise<ParticipacionGlobal[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_participaciones_vigentes_global");

  if (error) return [];

  return ((data ?? []) as any[]).map((p) => ({
    id: `${p.persona_id}:${p.proceso_id}:${p.rol}`,
    usuarioNombre: p.nombre_completo || "—",
    procesoId: p.proceso_id ?? "",
    procesoNombre: p.proceso_nombre ?? "—",
    procesoTipo: p.proceso_tipo ?? "",
    rol: p.rol,
  }));
}
