"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/**
 * Cierra una auditoría (estado 'cerrada') con validación estricta: sin NCs
 * abiertas vinculadas a sus hallazgos ni acciones abiertas. Requiere
 * conclusiones. La validación real la hace fn_cerrar_auditoria en la base.
 */
export async function cerrarAuditoria(
  auditoriaId: string,
  conclusiones: string,
): Promise<ResultadoCierre> {
  if (conclusiones.trim().length < 5) {
    return { ok: false, error: "Las conclusiones son obligatorias (mínimo 5 caracteres)." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_cerrar_auditoria", {
    p_auditoria_id: auditoriaId,
    p_conclusiones: conclusiones.trim(),
  });

  if (error) return { ok: false, error: error.message };

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.cerrada) {
    return { ok: false, error: fila?.mensaje ?? "No se pudo cerrar la auditoría." };
  }

  revalidatePath(`/auditorias/${auditoriaId}`);
  revalidatePath("/auditorias");
  revalidatePath("/dashboard");
  return { ok: true, mensaje: fila.mensaje };
}
