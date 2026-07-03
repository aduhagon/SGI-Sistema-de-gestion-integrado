import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Contexto mínimo que necesita el layout de la app, derivado de
 * fn_contexto_layout() (SECURITY DEFINER, STABLE).
 *
 * Reemplaza 4 llamadas secuenciales/paralelas del layout (select usuarios,
 * fn_es_superadmin, fn_usuario_es_admin + fn_usuario_tiene_rol_global,
 * fn_obtener_modulos) por un único round-trip a la base.
 *
 * Envuelto en React cache(): si el layout y una página lo piden en el mismo
 * request, la llamada a la base se ejecuta una sola vez.
 */
export type ContextoLayout = {
  usuarioId: string | null;
  esSuperadmin: boolean;
  esAdminSgi: boolean;
  modulosHabilitados: string[];
};

const CONTEXTO_VACIO: ContextoLayout = {
  usuarioId: null,
  esSuperadmin: false,
  esAdminSgi: false,
  modulosHabilitados: [],
};

export const obtenerContextoLayout = cache(async (): Promise<ContextoLayout> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_contexto_layout");

  if (error || !data || typeof data !== "object") {
    // Ante cualquier problema devolvemos el contexto mínimo: el usuario ve
    // solo los ítems base del menú. Es el comportamiento más seguro.
    return CONTEXTO_VACIO;
  }

  const d = data as Record<string, unknown>;
  return {
    usuarioId: typeof d.usuario_id === "string" ? d.usuario_id : null,
    esSuperadmin: Boolean(d.es_superadmin),
    esAdminSgi: Boolean(d.es_admin_sgi),
    modulosHabilitados: Array.isArray(d.modulos_habilitados)
      ? (d.modulos_habilitados as string[])
      : [],
  };
});
