"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoRol =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const rolSchema = z.object({
  puestoId: z.string().uuid(),
  procesoId: z.string().uuid("Elegí un proceso."),
  rol: z.enum(
    ["responsable_proceso", "elaborador", "aprobador_n1", "aprobador_n2", "lector"],
    { errorMap: () => ({ message: "Elegí un rol." }) },
  ),
  motivo: z.string().min(5, "El motivo es obligatorio (mínimo 5 caracteres)."),
});

export async function agregarRolEnProceso(
  _prev: EstadoRol,
  formData: FormData,
): Promise<EstadoRol> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = rolSchema.safeParse({
    puestoId: formData.get("puestoId"),
    procesoId: formData.get("procesoId"),
    rol: formData.get("rol"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { puestoId, procesoId, rol, motivo } = parsed.data;

  // ¿Ya existe esa combinación (incluso inactiva)? La reactivamos.
  const { data: existente } = await supabase
    .from("puesto_proceso_rol")
    .select("id, activo")
    .eq("puesto_id", puestoId)
    .eq("proceso_id", procesoId)
    .eq("rol_en_proceso", rol)
    .maybeSingle();

  if (existente) {
    if (existente.activo) {
      return { ok: false, error: "Ese puesto ya tiene ese rol en ese proceso." };
    }
    const { error } = await supabase
      .from("puesto_proceso_rol")
      .update({
        activo: true,
        eliminado_en: null,
        eliminado_por: null,
        motivo_eliminacion: null,
        motivo_asignacion: motivo,
      })
      .eq("id", existente.id);
    if (error) return { ok: false, error: `No se pudo reactivar: ${error.message}` };
  } else {
    const { error } = await supabase.from("puesto_proceso_rol").insert({
      puesto_id: puestoId,
      proceso_id: procesoId,
      rol_en_proceso: rol,
      creado_por: usuarioId,
      motivo_asignacion: motivo,
    });
    if (error) {
      const msg = error.message.includes("row-level security")
        ? "No tenés permisos para asignar roles."
        : `No se pudo asignar: ${error.message}`;
      return { ok: false, error: msg };
    }
  }

  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return { ok: true };
}

export async function quitarRolEnProceso(
  puestoId: string,
  rolId: string,
  motivo: string,
): Promise<EstadoRol> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  const { error } = await supabase
    .from("puesto_proceso_rol")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      motivo_eliminacion: motivo.trim(),
    })
    .eq("id", rolId);

  if (error) return { ok: false, error: `No se pudo quitar: ${error.message}` };

  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return { ok: true };
}
