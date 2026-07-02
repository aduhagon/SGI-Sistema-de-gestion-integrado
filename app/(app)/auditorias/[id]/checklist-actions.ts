"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoChecklist =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const RESULTADOS_VALIDOS = ["pendiente", "conforme", "no_conforme", "no_aplica"];

function traducirError(msg: string): string {
  if (msg.includes("row-level security"))
    return "No tenés permiso para modificar el checklist de esta auditoría.";
  // Los triggers de la base ya devuelven mensajes claros en castellano.
  return msg;
}

function limpiarUuid(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string" || v === "") return null;
  return v;
}

/** Agrega un ítem al checklist (líder, con la auditoría planificada). */
export async function agregarItemChecklist(
  _prev: EstadoChecklist,
  formData: FormData,
): Promise<EstadoChecklist> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const auditoriaId = formData.get("auditoriaId");
  const descripcion = formData.get("descripcion");
  if (typeof auditoriaId !== "string" || !auditoriaId) {
    return { ok: false, error: "Auditoría inválida." };
  }
  if (typeof descripcion !== "string" || descripcion.trim().length < 3) {
    return { ok: false, error: "Describí qué se va a verificar (mínimo 3 caracteres)." };
  }

  // Orden: al final de la lista.
  const { count } = await supabase
    .from("auditoria_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("auditoria_id", auditoriaId)
    .eq("activo", true)
    .is("eliminado_en", null);

  const { error } = await supabase.from("auditoria_checklist_items").insert({
    auditoria_id: auditoriaId,
    orden: (count ?? 0) + 1,
    descripcion: descripcion.trim(),
    requisito_id: limpiarUuid(formData.get("requisitoId")),
    creado_por: usuarioId,
  });

  if (error) return { ok: false, error: traducirError(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}

/** Edita descripción/requisito de un ítem (líder, en planificación). */
export async function editarItemChecklist(
  _prev: EstadoChecklist,
  formData: FormData,
): Promise<EstadoChecklist> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const auditoriaId = formData.get("auditoriaId");
  const itemId = formData.get("itemId");
  const descripcion = formData.get("descripcion");
  if (typeof auditoriaId !== "string" || typeof itemId !== "string" || !itemId) {
    return { ok: false, error: "Ítem inválido." };
  }
  if (typeof descripcion !== "string" || descripcion.trim().length < 3) {
    return { ok: false, error: "Describí qué se va a verificar (mínimo 3 caracteres)." };
  }

  const { error } = await supabase
    .from("auditoria_checklist_items")
    .update({
      descripcion: descripcion.trim(),
      requisito_id: limpiarUuid(formData.get("requisitoId")),
      actualizado_por: usuarioId,
    })
    .eq("id", itemId)
    .eq("auditoria_id", auditoriaId);

  if (error) return { ok: false, error: traducirError(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}

/** Quita un ítem del checklist (soft delete; solo en planificación). */
export async function quitarItemChecklist(
  auditoriaId: string,
  itemId: string,
): Promise<EstadoChecklist> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("auditoria_checklist_items")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Ítem quitado durante la planificación",
    })
    .eq("id", itemId)
    .eq("auditoria_id", auditoriaId);

  if (error) return { ok: false, error: traducirError(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}

/** Completa el resultado de un ítem (equipo, con la auditoría en curso). */
export async function completarItemChecklist(
  _prev: EstadoChecklist,
  formData: FormData,
): Promise<EstadoChecklist> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const auditoriaId = formData.get("auditoriaId");
  const itemId = formData.get("itemId");
  const resultado = formData.get("resultado");
  const comentario = formData.get("comentario");

  if (typeof auditoriaId !== "string" || typeof itemId !== "string" || !itemId) {
    return { ok: false, error: "Ítem inválido." };
  }
  if (typeof resultado !== "string" || !RESULTADOS_VALIDOS.includes(resultado)) {
    return { ok: false, error: "Elegí el resultado de la verificación." };
  }

  const { error } = await supabase
    .from("auditoria_checklist_items")
    .update({
      resultado,
      comentario:
        typeof comentario === "string" && comentario.trim() ? comentario.trim() : null,
      actualizado_por: usuarioId,
      // completado_en / completado_por los setea el trigger de la base.
    })
    .eq("id", itemId)
    .eq("auditoria_id", auditoriaId);

  if (error) return { ok: false, error: traducirError(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}
