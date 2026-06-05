"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearNCSchema } from "@/lib/schemas/nc";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoNC } from "@/lib/api/ncs";

export type EstadoCrearNC =
  | { ok: true; ncId: string }
  | { ok: false; error: string; campo?: string }
  | null;

export async function crearNC(
  _estadoPrevio: EstadoCrearNC,
  formData: FormData,
): Promise<EstadoCrearNC> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const parsed = crearNCSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    tipo: formData.get("tipo") || "no_conformidad",
    severidad: formData.get("severidad") || "media",
    origen: formData.get("origen"),
    hallazgoId: formData.get("hallazgoId") || undefined,
    origenDescripcion: formData.get("origenDescripcion") || undefined,
    procesoId: formData.get("procesoId") || undefined,
    fechaLimiteCierre: formData.get("fechaLimiteCierre") || undefined,
    requiereAccionInmediata: formData.get("requiereAccionInmediata") === "on",
    accionInmediataDescripcion: formData.get("accionInmediataDescripcion") || undefined,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const input = parsed.data;
  const codigo = await generarCodigoNC();
  const hallazgoId = input.hallazgoId && input.hallazgoId !== "" ? input.hallazgoId : null;
  const procesoId = input.procesoId && input.procesoId !== "" ? input.procesoId : null;

  const { data: nc, error } = await supabase
    .from("no_conformidades")
    .insert({
      codigo,
      titulo: input.titulo,
      descripcion: input.descripcion,
      tipo: input.tipo,
      severidad: input.severidad,
      origen: input.origen,
      hallazgo_id: hallazgoId,
      origen_descripcion: input.origenDescripcion ?? null,
      proceso_id: procesoId,
      fecha_limite_cierre:
        input.fechaLimiteCierre && input.fechaLimiteCierre !== ""
          ? input.fechaLimiteCierre
          : null,
      requiere_accion_inmediata: input.requiereAccionInmediata,
      accion_inmediata_descripcion: input.accionInmediataDescripcion ?? null,
      estado: "abierta",
      responsable_tratamiento_id: usuarioId,
      creado_por: usuarioId,
    })
    .select("id")
    .single();

  if (error || !nc) {
    let msg = `No se pudo crear la no conformidad: ${error?.message ?? "desconocido"}`;
    if (error?.message.includes("chk_nc_auditoria_tiene_hallazgo"))
      msg = "Las NC de origen auditoría deben vincularse a un hallazgo.";
    else if (error?.message.includes("chk_nc_codigo")) msg = "Error generando el código. Reintentá.";
    return { ok: false, error: msg };
  }

  // Si viene de un hallazgo, vincular el hallazgo a esta NC.
  if (hallazgoId) {
    await supabase
      .from("hallazgos")
      .update({ no_conformidad_id: nc.id })
      .eq("id", hallazgoId);
  }

  revalidatePath("/ncs");
  revalidatePath("/dashboard");
  redirect(`/ncs/${nc.id}?creada=1`);
}
