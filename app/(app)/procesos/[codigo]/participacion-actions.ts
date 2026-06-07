"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { participacionSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoParticipacion =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function asignarParticipacion(
  _prev: EstadoParticipacion,
  formData: FormData,
): Promise<EstadoParticipacion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = participacionSchema.safeParse({
    procesoId: formData.get("procesoId"),
    usuarioId: formData.get("usuarioId"),
    rol: formData.get("rol"),
    motivoAsignacion: formData.get("motivoAsignacion") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const input = parsed.data;

  // Evitar duplicar la misma asignación vigente (usuario+proceso+rol).
  const { data: existente } = await supabase
    .from("participacion_usuario_proceso")
    .select("id")
    .eq("proceso_id", input.procesoId)
    .eq("usuario_id", input.usuarioId)
    .eq("rol_en_proceso", input.rol)
    .is("vigente_hasta", null)
    .maybeSingle();

  if (existente) {
    return {
      ok: false,
      error: "Ese usuario ya tiene ese rol asignado en este proceso.",
      campo: "usuarioId",
    };
  }

  const { error } = await supabase.from("participacion_usuario_proceso").insert({
    proceso_id: input.procesoId,
    usuario_id: input.usuarioId,
    rol_en_proceso: input.rol,
    motivo_asignacion: input.motivoAsignacion ?? null,
    asignado_por: usuarioId,
    creado_por: usuarioId,
  });

  if (error) {
    const msg = error.message.includes("row-level security")
      ? "No tenés permisos para asignar participaciones."
      : `No se pudo asignar: ${error.message}`;
    return { ok: false, error: msg };
  }

  revalidatePath(`/procesos`);
  return { ok: true };
}
