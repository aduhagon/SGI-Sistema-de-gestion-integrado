"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoMarcaErp = { ok: true } | { ok: false; error: string };

/**
 * Marca un formulario como gestionado dentro (true) o fuera (false) del ERP,
 * o lo deja sin clasificar (null). Opcionalmente registra el sistema externo.
 */
export async function marcarOrigenErp(
  documentoId: string,
  codigoProceso: string,
  valor: boolean | null,
  sistemaExterno?: string | null,
): Promise<EstadoMarcaErp> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const patch: Record<string, unknown> = {
    gestionado_en_erp: valor,
    // Si vuelve al ERP o queda sin clasificar, se limpia el sistema externo.
    sistema_externo: valor === false ? (sistemaExterno ?? null) : null,
    actualizado_en: new Date().toISOString(),
    actualizado_por: usuarioId,
  };

  const { error } = await supabase.from("documentos").update(patch).eq("id", documentoId);

  if (error) {
    return { ok: false, error: `No se pudo guardar la marca: ${error.message}` };
  }

  if (codigoProceso) revalidatePath(`/procesos/${codigoProceso}`);
  revalidatePath("/procesos");
  revalidatePath("/flujogramas");
  revalidatePath("/dashboard");
  return { ok: true };
}
