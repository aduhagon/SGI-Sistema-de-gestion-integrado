"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoReabrir =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Reabre una versión rechazada: vuelve a estado borrador para poder corregir el
 * archivo y reenviar a aprobación. El historial del rechazo (quién, cuándo, por
 * qué) permanece en decisiones_aprobacion, que es inmutable.
 */
export async function reabrirVersionRechazada(
  documentoId: string,
  versionId: string,
): Promise<EstadoReabrir> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const { error } = await supabase.rpc("fn_reabrir_version_rechazada", {
    p_version_id: versionId,
  });

  if (error) {
    return { ok: false, error: `No se pudo reabrir la versión: ${error.message}` };
  }

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  return { ok: true };
}
