"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoEquipo =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const ROLES_VALIDOS = ["lider", "auditor", "observador"];

function mensajeRLS(msg: string): string {
  return msg.includes("row-level security")
    ? "No tenés permiso para modificar el equipo de esta auditoría."
    : msg;
}

/** Suma un integrante (interno o externo) al equipo de la auditoría. */
export async function agregarMiembroEquipo(
  _prev: EstadoEquipo,
  formData: FormData,
): Promise<EstadoEquipo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const auditoriaId = formData.get("auditoriaId");
  const modo = formData.get("modo"); // "interno" | "externo"
  const rol = formData.get("rol");

  if (typeof auditoriaId !== "string" || !auditoriaId) {
    return { ok: false, error: "Auditoría inválida." };
  }
  if (typeof rol !== "string" || !ROLES_VALIDOS.includes(rol)) {
    return { ok: false, error: "Elegí el rol dentro del equipo." };
  }

  const fila: Record<string, unknown> = {
    auditoria_id: auditoriaId,
    rol_auditoria: rol,
    creado_por: usuarioId,
  };

  if (modo === "externo") {
    const nombre = formData.get("nombreExterno");
    if (typeof nombre !== "string" || nombre.trim().length < 3) {
      return { ok: false, error: "Indicá el nombre del auditor externo." };
    }
    fila.nombre_externo = nombre.trim();
    const email = formData.get("emailExterno");
    if (typeof email === "string" && email.trim()) fila.email_externo = email.trim();
    const org = formData.get("organizacionExterna");
    if (typeof org === "string" && org.trim()) fila.organizacion_externa = org.trim();
  } else {
    const miembroUsuarioId = formData.get("usuarioId");
    if (typeof miembroUsuarioId !== "string" || !miembroUsuarioId) {
      return { ok: false, error: "Elegí el usuario a sumar al equipo." };
    }
    fila.usuario_id = miembroUsuarioId;

    // Evitar duplicados activos del mismo usuario.
    const { data: existente } = await supabase
      .from("auditoria_equipo")
      .select("id")
      .eq("auditoria_id", auditoriaId)
      .eq("usuario_id", miembroUsuarioId)
      .eq("activo", true)
      .is("eliminado_en", null)
      .maybeSingle();
    if (existente) {
      return { ok: false, error: "Esa persona ya integra el equipo de esta auditoría." };
    }
  }

  const { error } = await supabase.from("auditoria_equipo").insert(fila);
  if (error) return { ok: false, error: mensajeRLS(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}

/** Quita un integrante del equipo (soft delete, coherente con el sistema). */
export async function quitarMiembroEquipo(
  auditoriaId: string,
  miembroId: string,
): Promise<EstadoEquipo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("auditoria_equipo")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Quitado del equipo desde el detalle de la auditoría",
    })
    .eq("id", miembroId)
    .eq("auditoria_id", auditoriaId);

  if (error) return { ok: false, error: mensajeRLS(error.message) };

  revalidatePath(`/auditorias/${auditoriaId}`);
  return { ok: true };
}
