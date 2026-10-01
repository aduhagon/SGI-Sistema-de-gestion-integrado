"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoConfig =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/** Guarda una clave de configuraciÃ³n (la validaciÃ³n de superadmin la hace la base). */
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

/** Habilita/deshabilita un mÃ³dulo. */
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
    return { ok: true, mensaje: "No habÃ­a correos fallidos de esta semana para reintentar." };
  }
  return { ok: true, mensaje: `Se reactivaron ${reactivados} correo(s) y se iniciaron ${reintentados} reintento(s).` };
}
