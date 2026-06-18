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
  gerencia: string;
  area: string;
  puestoPrincipal: string | null;
  roles: { codigo: string; nombre: string }[];
};

const SIN_GERENCIA = "Sin gerencia";
const SIN_AREA = "Sin área asignada";

// Catálogo de roles globales activos (para las columnas de la matriz).
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

// Usuarios activos con roles vigentes + gerencia/área del puesto principal.
// Puesto principal = persona_puesto vigente más reciente (vigente_desde DESC).
export async function listarUsuariosConRoles(): Promise<UsuarioConRoles[]> {
  const supabase = createClient();

  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "id, persona_id, username, persona:personas!usuarios_persona_id_fkey(nombre, apellido, email)",
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("username");
  if (error || !usuarios) return [];

  // Roles globales vigentes por usuario.
  const { data: asigs } = await supabase
    .from("asignaciones_rol_global")
    .select(
      "usuario_id, rol:roles_globales!asignaciones_rol_global_rol_id_fkey(codigo, nombre)",
    )
    .is("vigente_hasta", null);

  const rolesPorUsuario = new Map<string, { codigo: string; nombre: string }[]>();
  for (const a of (asigs ?? []) as any[]) {
    if (!a.rol) continue;
    const arr = rolesPorUsuario.get(a.usuario_id) ?? [];
    arr.push({ codigo: a.rol.codigo, nombre: a.rol.nombre });
    rolesPorUsuario.set(a.usuario_id, arr);
  }

  // Puestos vigentes de cada persona (para elegir el principal).
  const personaIds = (usuarios as any[]).map((u) => u.persona_id);
  const { data: pps } = await supabase
    .from("persona_puesto")
    .select(
      "persona_id, vigente_desde, puesto:puestos!persona_puesto_puesto_id_fkey(nombre, area:areas!puestos_area_id_fkey(nombre, area_padre:areas!areas_area_padre_id_fkey(nombre)))",
    )
    .is("vigente_hasta", null)
    .in("persona_id", personaIds);

  // Para cada persona, quedarse con el puesto de vigente_desde más reciente.
  const puestoPorPersona = new Map<
    string,
    { puesto: string; area: string; gerencia: string; desde: string | null }
  >();
  for (const pp of (pps ?? []) as any[]) {
    const actual = puestoPorPersona.get(pp.persona_id);
    const desde = pp.vigente_desde ?? null;
    if (!actual || (desde ?? "") > (actual.desde ?? "")) {
      puestoPorPersona.set(pp.persona_id, {
        puesto: pp.puesto?.nombre ?? "",
        area: pp.puesto?.area?.nombre ?? SIN_AREA,
        gerencia: pp.puesto?.area?.area_padre?.nombre ?? SIN_GERENCIA,
        desde,
      });
    }
  }

  return (usuarios as any[]).map((u) => {
    const per = u.persona;
    const nombre = per ? `${per.nombre} ${per.apellido}`.trim() : u.username;
    const pp = puestoPorPersona.get(u.persona_id);
    return {
      usuarioId: u.id,
      username: u.username,
      personaNombre: nombre,
      email: per?.email ?? null,
      gerencia: pp?.gerencia ?? SIN_GERENCIA,
      area: pp?.area ?? SIN_AREA,
      puestoPrincipal: pp?.puesto || null,
      roles: rolesPorUsuario.get(u.id) ?? [],
    };
  });
}
