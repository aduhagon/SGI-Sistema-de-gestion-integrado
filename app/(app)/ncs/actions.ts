"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { tratamientoObservacionSchema } from "@/lib/schemas/observacion";

export type EstadoObservacion =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarTratamientoObservacion(
  _prev: EstadoObservacion,
  formData: FormData,
): Promise<EstadoObservacion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = tratamientoObservacionSchema.safeParse({
    id: formData.get("id"),
    estado: formData.get("estado"),
    responsableId: formData.get("responsableId") || undefined,
    accionTratamiento: formData.get("accionTratamiento") || undefined,
    fechaLimite: formData.get("fechaLimite") || undefined,
    motivoCierre: formData.get("motivoCierre") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const limpio = (v?: string) => (v && v !== "" ? v : null);
  const cerrando = i.estado === "cerrado";

  // Regla de negocio: cerrar exige un motivo (igual que el cierre de una NC).
  if (cerrando && !limpio(i.motivoCierre)) {
    return { ok: false, error: "Para cerrar la observación indicá un motivo de cierre.", campo: "motivoCierre" };
  }

  const payload: Record<string, unknown> = {
    estado: i.estado,
    responsable_tratamiento_id: limpio(i.responsableId),
    accion_tratamiento: limpio(i.accionTratamiento),
    fecha_limite: limpio(i.fechaLimite),
    motivo_cierre: limpio(i.motivoCierre),
    actualizado_en: new Date().toISOString(),
    actualizado_por: usuarioId,
    // Poblar/limpiar la fecha de cierre según el estado.
    fecha_cierre_real: cerrando ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from("hallazgos").update(payload).eq("id", i.id);
  if (error) {
    if (error.message.includes("row-level security") || error.message.includes("policy"))
      return { ok: false, error: "No tenés permisos para tratar esta observación. El tratamiento lo cargan auditores, el rol SGI o quien la detectó." };
    return { ok: false, error: `No se pudo guardar: ${error.message}` };
  }

  revalidatePath("/ncs");
  revalidatePath(`/ncs/observacion/${i.id}`);
  return { ok: true };
}
