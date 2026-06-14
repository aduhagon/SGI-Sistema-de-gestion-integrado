import { createClient } from "@/lib/supabase/server";

/**
 * Perfil de menú del usuario actual, derivado de fn_perfil_menu_usuario().
 *
 * La función de la base (SECURITY DEFINER, STABLE) devuelve un jsonb con la
 * forma:
 *   {
 *     "roles": ["admin", ...],
 *     "es_gestor": boolean,
 *     "es_aprobador": boolean,
 *     "es_elaborador": boolean
 *   }
 *
 * Acá lo normalizamos a camelCase para el front.
 */
export type PerfilMenu = {
  roles: string[];
  esGestor: boolean;
  esAprobador: boolean;
  esElaborador: boolean;
  esSuperadmin: boolean;
};

const PERFIL_VACIO: PerfilMenu = {
  roles: [],
  esGestor: false,
  esAprobador: false,
  esElaborador: false,
  esSuperadmin: false,
};

export async function obtenerPerfilMenu(): Promise<PerfilMenu> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_perfil_menu_usuario");

  if (error || !data || typeof data !== "object") {
    // Ante cualquier problema devolvemos el perfil mínimo: el usuario ve solo
    // los ítems base. Es el comportamiento más seguro (no abre de más).
    return PERFIL_VACIO;
  }

  const d = data as Record<string, unknown>;
  return {
    roles: Array.isArray(d.roles) ? (d.roles as string[]) : [],
    esGestor: Boolean(d.es_gestor),
    esAprobador: Boolean(d.es_aprobador),
    esElaborador: Boolean(d.es_elaborador),
    esSuperadmin: Boolean(d.es_superadmin),
  };
}
