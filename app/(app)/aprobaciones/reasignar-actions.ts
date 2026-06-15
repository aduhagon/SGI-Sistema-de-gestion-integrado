"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ResultadoReasignar =
  | { ok: true; aprobadorNuevo: string }
  | { ok: false; error: string };

/**
 * Reasigna el aprobador de un nivel (1 o 2) de una aprobación abierta.
 * La validación de permisos (solo admin) y el registro de auditoría ocurren
 * dentro de la función SQL fn_reasignar_aprobador.
 */
export async function reasignarAprobador(
  aprobacionId: string,
  nivel: number,
  nuevoAprobadorId: string,
  motivo: string,
): Promise<ResultadoReasignar> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("fn_reasignar_aprobador", {
    p_aprobacion_id: aprobacionId,
    p_nivel: nivel,
    p_nuevo_aprobador_id: nuevoAprobadorId,
    p_motivo: motivo,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const r = data as { ok: boolean; error?: string; aprobador_nuevo?: string };
  if (!r.ok) {
    return { ok: false, error: r.error ?? "No se pudo reasignar." };
  }

  revalidatePath("/aprobaciones");
  return { ok: true, aprobadorNuevo: r.aprobador_nuevo ?? nuevoAprobadorId };
}
