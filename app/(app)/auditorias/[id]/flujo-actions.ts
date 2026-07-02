"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoFlujo =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

type FilaFlujo = { ok: boolean; mensaje: string };

async function llamarFuncionFlujo(
  fn: string,
  params: Record<string, unknown>,
  auditoriaId: string,
): Promise<ResultadoFlujo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, params);

  if (error) return { ok: false, error: error.message };

  const fila = (Array.isArray(data) ? data[0] : data) as FilaFlujo | null;
  if (!fila?.ok) {
    return { ok: false, error: fila?.mensaje ?? "No se pudo completar la acción." };
  }

  revalidatePath(`/auditorias/${auditoriaId}`);
  revalidatePath("/auditorias");
  revalidatePath("/dashboard");
  return { ok: true, mensaje: fila.mensaje };
}

export async function iniciarAuditoria(auditoriaId: string): Promise<ResultadoFlujo> {
  return llamarFuncionFlujo("fn_iniciar_auditoria", { p_auditoria_id: auditoriaId }, auditoriaId);
}

export async function emitirInforme(auditoriaId: string): Promise<ResultadoFlujo> {
  return llamarFuncionFlujo("fn_emitir_informe_auditoria", { p_auditoria_id: auditoriaId }, auditoriaId);
}

export async function devolverInforme(auditoriaId: string, motivo: string): Promise<ResultadoFlujo> {
  if (motivo.trim().length < 5) {
    return { ok: false, error: "Indicá el motivo de la devolución (mínimo 5 caracteres)." };
  }
  return llamarFuncionFlujo("fn_devolver_informe_auditoria", { p_auditoria_id: auditoriaId, p_motivo: motivo.trim() }, auditoriaId);
}

export async function aprobarCierre(auditoriaId: string, conclusiones: string): Promise<ResultadoFlujo> {
  if (conclusiones.trim().length < 5) {
    return { ok: false, error: "Las conclusiones son obligatorias (mínimo 5 caracteres)." };
  }
  return llamarFuncionFlujo("fn_aprobar_cierre_auditoria", { p_auditoria_id: auditoriaId, p_conclusiones: conclusiones.trim() }, auditoriaId);
}
