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
