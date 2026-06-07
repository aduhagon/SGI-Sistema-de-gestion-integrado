import { createClient } from "@/lib/supabase/server";

export type Participacion = {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: string;
  vigenteDesde: string;
};

export type UsuarioParaAsignar = {
  id: string;
  nombre: string;
};

// Participaciones vigentes de un proceso (vigente_hasta IS NULL).
export async function obtenerParticipacionesDeProceso(
  procesoId: string,
): Promise<Participacion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("participacion_usuario_proceso")
    .select(
      `id, rol_en_proceso, vigente_desde, usuario_id,
       usuario:usuarios!participacion_usuario_proceso_usuario_id_fkey (
         username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)
       )`,
    )
    .eq("proceso_id", procesoId)
    .is("vigente_hasta", null)
    .order("rol_en_proceso", { ascending: true });

  if (error) return [];

  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    usuarioId: p.usuario_id,
    usuarioNombre: p.usuario?.personas
      ? `${p.usuario.personas.nombre} ${p.usuario.personas.apellido}`.trim()
      : p.usuario?.username ?? "—",
    rol: p.rol_en_proceso,
    vigenteDesde: p.vigente_desde,
  }));
}

// Todos los usuarios activos del sistema, para el selector.
export async function obtenerUsuariosParaAsignar(): Promise<UsuarioParaAsignar[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select(
      `id, username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)`,
    )
    .eq("activo", true)
    .is("eliminado_en", null);

  if (error) return [];

  return ((data ?? []) as any[])
    .map((u) => ({
      id: u.id,
      nombre: u.personas
        ? `${u.personas.nombre} ${u.personas.apellido}`.trim()
        : u.username,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
