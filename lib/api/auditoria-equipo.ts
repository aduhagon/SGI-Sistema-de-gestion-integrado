import { createClient } from "@/lib/supabase/server";

export type MiembroEquipo = {
  id: string;
  usuarioId: string | null;
  nombre: string;
  email: string | null;
  organizacion: string | null;
  esExterno: boolean;
  rol: string; // lider | auditor | observador
};

export type CandidatoEquipo = {
  usuarioId: string;
  nombre: string;
  email: string | null;
  roles: string[];
};

export type PermisosAuditoria = {
  esAuditorOSgi: boolean;
  esSgiOAdmin: boolean;
  esLider: boolean;
  esMiembroEquipo: boolean;
};

/** Equipo activo de la auditoría (internos y externos). */
export async function obtenerEquipoDeAuditoria(
  auditoriaId: string,
): Promise<MiembroEquipo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auditoria_equipo")
    .select(
      `id, usuario_id, nombre_externo, email_externo, organizacion_externa, rol_auditoria,
       usuario:usuarios!auditoria_equipo_usuario_id_fkey (
         username,
         persona:personas!usuarios_persona_id_fkey (nombre, apellido, email)
       )`,
    )
    .eq("auditoria_id", auditoriaId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(`No se pudo cargar el equipo: ${error.message}`);

  type Fila = {
    id: string;
    usuario_id: string | null;
    nombre_externo: string | null;
    email_externo: string | null;
    organizacion_externa: string | null;
    rol_auditoria: string;
    usuario: {
      username: string;
      persona: { nombre: string; apellido: string; email: string | null } | null;
    } | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((m) => {
    const per = m.usuario?.persona;
    const nombreInterno = per
      ? `${per.nombre} ${per.apellido}`.trim()
      : m.usuario?.username ?? "";
    return {
      id: m.id,
      usuarioId: m.usuario_id,
      nombre: m.usuario_id ? nombreInterno : m.nombre_externo ?? "—",
      email: m.usuario_id ? per?.email ?? null : m.email_externo,
      organizacion: m.organizacion_externa,
      esExterno: !m.usuario_id,
      rol: m.rol_auditoria,
    };
  });
}

const ROLES_AUDITORES = ["auditor", "responsable_sgi", "admin"];

/**
 * Usuarios activos habilitados para integrar equipos auditores: quienes
 * tienen rol global auditor, responsable_sgi o admin vigente.
 */
export async function obtenerCandidatosEquipo(): Promise<CandidatoEquipo[]> {
  const supabase = createClient();

  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "id, username, persona:personas!usuarios_persona_id_fkey (nombre, apellido, email)",
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("username");
  if (error || !usuarios) return [];

  const { data: asigs } = await supabase
    .from("asignaciones_rol_global")
    .select(
      "usuario_id, rol:roles_globales!asignaciones_rol_global_rol_id_fkey (codigo)",
    )
    .is("vigente_hasta", null);

  const rolesPorUsuario = new Map<string, string[]>();
  for (const a of (asigs ?? []) as any[]) {
    if (!a.rol?.codigo) continue;
    const arr = rolesPorUsuario.get(a.usuario_id) ?? [];
    arr.push(a.rol.codigo);
    rolesPorUsuario.set(a.usuario_id, arr);
  }

  return (usuarios as any[])
    .map((u) => {
      const per = u.persona;
      return {
        usuarioId: u.id as string,
        nombre: per ? `${per.nombre} ${per.apellido}`.trim() : (u.username as string),
        email: (per?.email as string | null) ?? null,
        roles: rolesPorUsuario.get(u.id) ?? [],
      };
    })
    .filter((c) => c.roles.some((r) => ROLES_AUDITORES.includes(r)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Permisos del usuario actual sobre una auditoría (se resuelven en la base). */
export async function obtenerPermisosAuditoria(
  auditoriaId: string,
): Promise<PermisosAuditoria> {
  const supabase = createClient();
  const [auditorOSgi, sgiOAdmin, lider, miembro] = await Promise.all([
    supabase.rpc("fn_usuario_es_auditor_o_sgi"),
    supabase.rpc("fn_usuario_es_sgi_o_admin"),
    supabase.rpc("fn_usuario_es_lider_auditoria", { p_auditoria_id: auditoriaId }),
    supabase.rpc("fn_usuario_es_miembro_equipo_auditoria", { p_auditoria_id: auditoriaId }),
  ]);
  return {
    esAuditorOSgi: auditorOSgi.data === true,
    esSgiOAdmin: sgiOAdmin.data === true,
    esLider: lider.data === true,
    esMiembroEquipo: miembro.data === true,
  };
}
