"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoSeguimientoPendiente } from "@/lib/api/pendientes";

const ESTADOS: EstadoSeguimientoPendiente[] = ["sin_revisar", "en_curso", "bloqueado", "contactado"];

function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor.trim() : "";
}

export async function guardarSeguimientoPendienteGerencial(formData: FormData): Promise<void> {
  const modulo = texto(formData, "modulo");
  const entidadId = texto(formData, "entidadId");
  const responsableClave = texto(formData, "responsableClave");
  const responsableNombre = texto(formData, "responsableNombre") || "Sin responsable";
  const estado = texto(formData, "estado") as EstadoSeguimientoPendiente;
  const nota = texto(formData, "nota");
  const volverA = texto(formData, "volverA") || "/mis-pendientes/gerencial";

  if (!modulo || !entidadId || !responsableClave || !ESTADOS.includes(estado)) {
    redirect(volverA);
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("fn_guardar_seguimiento_pendiente_gerencial", {
    p_modulo: modulo,
    p_entidad_id: entidadId,
    p_responsable_clave: responsableClave,
    p_responsable_nombre: responsableNombre,
    p_estado: estado,
    p_nota: nota || null,
  });

  if (error) console.error("[SGI:pendientes] guardar seguimiento gerencial", error);

  revalidatePath("/mis-pendientes");
  revalidatePath("/mis-pendientes/gerencial");
  redirect(volverA);
}
