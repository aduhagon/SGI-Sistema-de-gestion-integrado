"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; requiereForzar?: boolean };

/**
 * Cierra una NC. La base (fn_cerrar_nc) exige una verificación de eficacia
 * con resultado 'eficaz'. Si no la hay, solo el SGI puede forzar el cierre
 * pasando forzar=true + justificación.
 *
 * Cuando el cierre se bloquea por falta de eficacia, devolvemos
 * requiereForzar=true para que la UI ofrezca el cierre forzado al SGI.
 */
export async function cerrarNC(
  ncId: string,
  motivo: string,
  forzar = false,
): Promise<ResultadoCierre> {
  if (motivo.trim().length < 5) {
    return { ok: false, error: "El motivo de cierre es obligatorio (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_cerrar_nc", {
    p_nc_id: ncId,
    p_motivo: motivo.trim(),
    p_forzar: forzar,
  });

  if (error) return { ok: false, error: error.message };

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.cerrada) {
    const msg = fila?.mensaje ?? "No se pudo cerrar la no conformidad.";
    // Detectamos el caso "falta eficacia" para ofrecer el forzado.
    const requiereForzar = msg.includes("verificación de eficacia");
    return { ok: false, error: msg, requiereForzar };
  }

  revalidatePath(`/ncs/${ncId}`);
  revalidatePath("/ncs");
  revalidatePath("/dashboard");
  return { ok: true, mensaje: fila.mensaje };
}
