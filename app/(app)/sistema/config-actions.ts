"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoConfig =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/** Guarda una clave de configuración (la validación de superadmin la hace la base). */
export async function setConfiguracion(
  clave: string,
  valor: unknown,
): Promise<ResultadoConfig> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_set_configuracion", {
    p_clave: clave,
    p_valor: valor,
  });
  if (error) return { ok: false, error: error.message };
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.ok) return { ok: false, error: fila?.mensaje ?? "No se pudo guardar." };
  revalidatePath("/sistema");
  revalidatePath("/", "layout");
  return { ok: true, mensaje: fila.mensaje };
}

/** Habilita/deshabilita un módulo. */
export async function setModulo(
  codigo: string,
  habilitado: boolean,
): Promise<ResultadoConfig> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_set_modulo", {
    p_codigo: codigo,
    p_habilitado: habilitado,
  });
  if (error) return { ok: false, error: error.message };
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.ok) return { ok: false, error: fila?.mensaje ?? "No se pudo guardar." };
  revalidatePath("/sistema");
  revalidatePath("/", "layout");
  return { ok: true, mensaje: fila.mensaje };
}

/** Reintenta solamente los correos fallidos del resumen de la semana actual. */
export async function reintentarCorreosSemana(): Promise<ResultadoConfig> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_correo_reintentar_resumen_semana");
  if (error) return { ok: false, error: error.message };

  const resultado = data as { reactivados?: number; reintentados?: number } | null;
  const reactivados = resultado?.reactivados ?? 0;
  const reintentados = resultado?.reintentados ?? 0;
  revalidatePath("/sistema");

  if (reactivados === 0) {
    return { ok: true, mensaje: "No había correos fallidos de esta semana para reintentar." };
  }
  return { ok: true, mensaje: `Reintento iniciado para ${reactivados} correo(s); ${reintentados} solicitud(es) iniciadas. Todavía no confirma el envío. El panel actualizará el resultado automáticamente durante un minuto.` };
}

/** Actualiza el horario funcional y la programación técnica del resumen semanal. */
export async function configurarResumenSemanal(
  dia: number,
  hora: string,
): Promise<ResultadoConfig> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_configurar_resumen_semanal", {
    p_dia: dia,
    p_hora: hora,
  });
  if (error) return { ok: false, error: error.message };
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.ok) return { ok: false, error: fila?.mensaje ?? "No se pudo actualizar la programación." };
  revalidatePath("/sistema");
  return { ok: true, mensaje: fila.mensaje };
}

/** Encola un correo de diagnóstico sin exponer credenciales SMTP al navegador. */
export async function enviarCorreoPrueba(destinatario: string): Promise<ResultadoConfig> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_correo_enviar_prueba", {
    p_destinatario: destinatario,
  });
  if (error) return { ok: false, error: error.message };
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.ok) return { ok: false, error: fila?.mensaje ?? "No se pudo enviar la prueba." };
  revalidatePath("/sistema");
  return { ok: true, mensaje: fila.mensaje };
}
