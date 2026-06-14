"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/**
 * Cierra una no conformidad (estado 'cerrada') con validación estricta:
 * todas sus acciones deben estar completadas o canceladas. Requiere motivo.
 * La validación real la hace fn_cerrar_nc en la base.
 */
export async function cerrarNC(
  ncId: string,
  motivo: string,
): Promise<ResultadoCierre> {
  if (motivo.trim().length < 5) {
    return { ok: false, error: "El motivo de cierre es obligatorio (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_cerrar_nc", {
    p_nc_id: ncId,
    p_motivo: motivo.trim(),
  });

  if (error) return { ok: false, error: error.message };

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.cerrada) {
    return { ok: false, error: fila?.mensaje ?? "No se pudo cerrar la no conformidad." };
  }

  revalidatePath(`/ncs/${ncId}`);
  revalidatePath("/ncs");
  revalidatePath("/dashboard");
  return { ok: true, mensaje: fila.mensaje };
}
