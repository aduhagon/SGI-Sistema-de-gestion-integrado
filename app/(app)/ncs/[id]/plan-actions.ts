"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { revalidarMejora } from "@/lib/revalidar-mejora";

const fecha = z.string().date("Indicá una fecha válida.");
const planSchema = z.object({
  ncId: z.string().uuid(), responsableId: z.string().uuid("Elegí un responsable."),
  verificadorId: z.string().uuid("Elegí un verificador SGI."), fechaCierre: fecha, fechaVerificacion: fecha,
  requiereInmediata: z.boolean(), correccion: z.string().trim().max(2000),
}).refine((v) => v.responsableId !== v.verificadorId, "El verificador debe ser otra persona.")
  .refine((v) => v.fechaVerificacion <= v.fechaCierre, "La verificación debe realizarse antes del cierre previsto.")
  .refine((v) => !v.requiereInmediata || v.correccion.length >= 5, "Describí la corrección inmediata.");

export type EstadoPlan = { ok: true } | { ok: false; error: string } | null;
export async function guardarPlanTratamiento(_prev: EstadoPlan, formData: FormData): Promise<EstadoPlan> {
  const actor = await obtenerUsuarioActualId();
  if (!actor) return { ok: false, error: "Sesión no válida." };
  const parsed = planSchema.safeParse({
    ncId: formData.get("ncId"), responsableId: formData.get("responsableId"), verificadorId: formData.get("verificadorId"),
    fechaCierre: formData.get("fechaCierre"), fechaVerificacion: formData.get("fechaVerificacion"),
    requiereInmediata: formData.get("requiereInmediata") === "on", correccion: formData.get("correccion") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const { error } = await createClient().from("no_conformidades").update({
    responsable_tratamiento_id: v.responsableId, verificador_eficacia_id: v.verificadorId,
    fecha_limite_cierre: v.fechaCierre, fecha_verificacion_prevista: v.fechaVerificacion,
    requiere_accion_inmediata: v.requiereInmediata, accion_inmediata_descripcion: v.correccion || null,
    actualizado_por: actor,
  }).eq("id", v.ncId).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidarMejora(v.ncId);
  return { ok: true };
}
