"use server";

import { createClient } from "@/lib/supabase/server";

export type RolGlobalCatalogo = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

export type UsuarioConRoles = {
  usuarioId: string;
  username: string;
  personaNombre: string;
  email: string | null;
  roles: { codigo: string; nombre: string }[];
};

// Catálogo de roles globales activos (para el selector).
export async function listarRolesGlobales(): Promise<RolGlobalCatalogo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles_globales")
    .select("codigo, nombre, descripcion")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo");
  if (error || !data) return [];
  return data as RolGlobalCatalogo[];
}

// Usuarios activos con sus roles globales vigentes.
export async function listarUsuariosConRoles(): Promise<UsuarioConRoles[]> {
  const supabase = createClient();

  // Usuarios activos + su persona.
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "id, username, persona:personas!usuarios_persona_id_fkey(nombre, apellido, email)",
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("username");
  if (error || !usuarios) return [];

  // Asignaciones vigentes (vigente_hasta IS NULL) con el rol.
  const { data: asigs } = await supabase
    .from("asignaciones_rol_global")
    .select("usuario_id, rol:roles_globales!asignaciones_rol_global_rol_id_fkey(codigo, nombre)")
    .is("vigente_hasta", null);

  const porUsuario = new Map<string, { codigo: string; nombre: string }[]>();
  for (const a of (asigs ?? []) as any[]) {
    if (!a.rol) continue;
    const arr = porUsuario.get(a.usuario_id) ?? [];
    arr.push({ codigo: a.rol.codigo, nombre: a.rol.nombre });
    porUsuario.set(a.usuario_id, arr);
  }

  return (usuarios as any[]).map((u) => {
    const per = u.persona;
    const nombre = per ? `${per.nombre} ${per.apellido}`.trim() : u.username;
    return {
      usuarioId: u.id,
      username: u.username,
      personaNombre: nombre,
      email: per?.email ?? null,
      roles: porUsuario.get(u.id) ?? [],
    };
  });
}
