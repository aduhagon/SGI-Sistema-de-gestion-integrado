import { createClient } from "@/lib/supabase/server";

/**
 * Configuración del sistema (single-tenant). Lee las funciones
 * fn_obtener_configuracion / fn_obtener_modulos y expone helpers tipados.
 */

export type ConfigItem = {
  clave: string;
  valor: unknown;
  categoria: string;
  descripcion: string | null;
  editable: boolean;
};

export type ModuloSistema = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  habilitado: boolean;
  nucleo: boolean;
  orden: number;
};

export type ConfiguracionSistema = {
  // general
  orgNombre: string;
  orgLogoUrl: string;
  // normas
  multinorma: boolean;
  normasActivas: string[];
  // correo
  correoEnvioHabilitado: boolean;
  correoFrom: string;
  correoRemitenteNombre: string;
  // crudo, por si hace falta
  raw: ConfigItem[];
};

function val<T>(items: ConfigItem[], clave: string, fallback: T): T {
  const it = items.find((i) => i.clave === clave);
  return it ? (it.valor as T) : fallback;
}

export async function obtenerConfiguracion(): Promise<ConfiguracionSistema> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_obtener_configuracion");
  const items = (error || !data ? [] : (data as ConfigItem[]));

  return {
    orgNombre: val(items, "org_nombre", ""),
    orgLogoUrl: val(items, "org_logo_url", ""),
    multinorma: val(items, "multinorma", true),
    normasActivas: val<string[]>(items, "normas_activas", []),
    correoEnvioHabilitado: val(items, "correo_envio_habilitado", false),
    correoFrom: val(items, "correo_from", ""),
    correoRemitenteNombre: val(items, "correo_remitente_nombre", ""),
    raw: items,
  };
}

export async function obtenerModulos(): Promise<ModuloSistema[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_obtener_modulos");
  if (error || !data) return [];
  return data as ModuloSistema[];
}

/** Lista de todas las normas del sistema (para el selector de normas activas). */
export async function obtenerNormasDisponibles(): Promise<
  { codigo: string; nombre: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("normas")
    .select("codigo, nombre_corto")
    .is("eliminado_en", null)
    .order("codigo");
  if (error || !data) return [];
  return (data as { codigo: string; nombre_corto: string }[]).map((n) => ({
    codigo: n.codigo,
    nombre: n.nombre_corto,
  }));
}
