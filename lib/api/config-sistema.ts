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
  correoReplyTo: string;
  correoResponsableSgi: string;
  correoAlertasTecnicas: string;
  resumenSemanalDia: number;
  resumenSemanalHora: string;
  aprobacionPlazoDiasDefault: number;
  ncPlazoCierreDiasDefault: number;
  requisitosAlertaDias: number;
  zonaHoraria: string;
  // continuidad
  backupUltimoVerificadoFecha: string;
  backupPeriodicidadDias: number;
  backupAlcance: "base_datos" | "base_datos_y_archivos";
  restoreUltimaPruebaFecha: string;
  restorePeriodicidadDias: number;
  continuidadResponsable: string;
  continuidadProcedimientoUrl: string;
  continuidadAlertasHabilitadas: boolean;
  continuidadAlertaRepetirDias: number;
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
    correoReplyTo: val(items, "correo_reply_to", ""),
    correoResponsableSgi: val(items, "correo_responsable_sgi", ""),
    correoAlertasTecnicas: val(items, "correo_alertas_tecnicas", ""),
    resumenSemanalDia: val(items, "resumen_semanal_dia", 1),
    resumenSemanalHora: val(items, "resumen_semanal_hora", "08:00"),
    aprobacionPlazoDiasDefault: val(items, "aprobacion_plazo_dias_default", 0),
    ncPlazoCierreDiasDefault: val(items, "nc_plazo_cierre_dias_default", 0),
    requisitosAlertaDias: val(items, "requisitos_alerta_dias", 30),
    zonaHoraria: val(items, "zona_horaria", "America/Argentina/Buenos_Aires"),
    backupUltimoVerificadoFecha: val(items, "backup_ultimo_verificado_fecha", ""),
    backupPeriodicidadDias: val(items, "backup_periodicidad_dias", 1),
    backupAlcance: val(items, "backup_alcance", "base_datos"),
    restoreUltimaPruebaFecha: val(items, "restore_ultima_prueba_fecha", ""),
    restorePeriodicidadDias: val(items, "restore_periodicidad_dias", 180),
    continuidadResponsable: val(items, "continuidad_responsable", ""),
    continuidadProcedimientoUrl: val(items, "continuidad_procedimiento_url", ""),
    continuidadAlertasHabilitadas: val(items, "continuidad_alertas_habilitadas", false),
    continuidadAlertaRepetirDias: val(items, "continuidad_alerta_repetir_dias", 7),
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
    .or("ambito.is.null,ambito.not.like.Marco legal%")
    .is("eliminado_en", null)
    .order("codigo");
  if (error || !data) return [];
  return (data as { codigo: string; nombre_corto: string }[]).map((n) => ({
    codigo: n.codigo,
    nombre: n.nombre_corto,
  }));
}

/**
 * Helper liviano: ¿el sistema está en modo multinorma? Para condicionar las
 * vistas comparativas (panorama / matriz multinorma). Si no se puede leer,
 * asume true (comportamiento por defecto histórico).
 */
export async function esMultinorma(): Promise<boolean> {
  const config = await obtenerConfiguracion();
  return config.multinorma;
}
