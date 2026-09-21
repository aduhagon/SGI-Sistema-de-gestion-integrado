"use server";

import { revalidarMejora } from "@/lib/revalidar-mejora";
import { z } from "zod";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; requiereForzar?: boolean };

// El cierre requiere la última verificación eficaz sobre el tratamiento vigente.
export async function cerrarNC(
  ncId: string,
  motivo: string,
  forzar = false,
): Promise<ResultadoCierre> {
  if (!(await obtenerUsuarioActualId()) || !z.string().uuid().safeParse(ncId).success) return { ok: false, error: "Sesión o NC inválida." };
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
    return { ok: false, error: msg };
  }

  revalidarMejora(ncId);
  return { ok: true, mensaje: fila.mensaje };
}
