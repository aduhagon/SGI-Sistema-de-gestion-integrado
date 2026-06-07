"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoPersona =
  | { ok: true; aviso?: string }
  | { ok: false; error: string }
  | null;

const asignarSchema = z.object({
  puestoId: z.string().uuid(),
  personaId: z.string().uuid("Elegí una persona."),
});

export async function asignarPersonaAPuesto(
  _prev: EstadoPersona,
  formData: FormData,
): Promise<EstadoPersona> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = asignarSchema.safeParse({
    puestoId: formData.get("puestoId"),
    personaId: formData.get("personaId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { puestoId, personaId } = parsed.data;

  // ¿Ya ocupa este puesto (vigente)?
  const { data: yaOcupa } = await supabase
    .from("persona_puesto")
    .select("id")
    .eq("puesto_id", puestoId)
    .eq("persona_id", personaId)
    .is("vigente_hasta", null)
    .maybeSingle();
  if (yaOcupa) {
    return { ok: false, error: "Esa persona ya ocupa este puesto." };
  }

  // 1) Registrar el vínculo persona-puesto.
  const { error: errVinculo } = await supabase.from("persona_puesto").insert({
    puesto_id: puestoId,
    persona_id: personaId,
    asignado_por: usuarioId,
    creado_por: usuarioId,
  });
  if (errVinculo) {
    const msg = errVinculo.message.includes("row-level security")
      ? "No tenés permisos para asignar personas a puestos."
      : `No se pudo asignar: ${errVinculo.message}`;
    return { ok: false, error: msg };
  }

  // 2) Materializar participaciones: buscar el usuario de la persona.
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("persona_id", personaId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!usuario) {
    return {
      ok: true,
      aviso:
        "La persona quedó asignada al puesto, pero no tiene cuenta de usuario, así que no se generaron participaciones en procesos. Cuando tenga cuenta, volvé a asignarla.",
    };
  }

  // Roles del puesto en procesos.
  const { data: roles } = await supabase
    .from("puesto_proceso_rol")
    .select("proceso_id, rol_en_proceso")
    .eq("puesto_id", puestoId)
    .eq("activo", true);

  const rolesList = (roles ?? []) as any[];
  if (rolesList.length === 0) {
    return {
      ok: true,
      aviso:
        "La persona quedó asignada al puesto. Este puesto todavía no tiene roles en procesos, así que no se generaron participaciones.",
    };
  }

  // Crear participación directa por cada rol, evitando duplicados vigentes.
  let materializadas = 0;
  for (const r of rolesList) {
    const { data: existe } = await supabase
      .from("participacion_usuario_proceso")
      .select("id")
      .eq("usuario_id", usuario.id)
      .eq("proceso_id", r.proceso_id)
      .eq("rol_en_proceso", r.rol_en_proceso)
      .is("vigente_hasta", null)
      .maybeSingle();
    if (existe) continue;

    const { error: errPart } = await supabase
      .from("participacion_usuario_proceso")
      .insert({
        usuario_id: usuario.id,
        proceso_id: r.proceso_id,
        rol_en_proceso: r.rol_en_proceso,
        motivo_asignacion: `Materializado desde puesto`,
        asignado_por: usuarioId,
        creado_por: usuarioId,
      });
    if (!errPart) materializadas++;
  }

  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return {
    ok: true,
    aviso:
      materializadas > 0
        ? `Persona asignada. Se generaron ${materializadas} participación(es) en procesos automáticamente.`
        : "Persona asignada. Las participaciones ya existían, no se duplicaron.",
  };
}

export async function quitarPersonaDePuesto(
  puestoId: string,
  personaPuestoId: string,
): Promise<EstadoPersona> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  // Cerrar la vigencia del vínculo (SCD2).
  const { error } = await supabase
    .from("persona_puesto")
    .update({
      vigente_hasta: new Date().toISOString(),
      motivo_revocacion: "Quitada del puesto desde configuración",
    })
    .eq("id", personaPuestoId);

  if (error) return { ok: false, error: `No se pudo quitar: ${error.message}` };

  // Nota: las participaciones materializadas NO se revocan automáticamente,
  // porque participacion_usuario_proceso no tiene policy de UPDATE (requiere
  // Edge Function). Se avisa al usuario.
  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return {
    ok: true,
    aviso:
      "Persona quitada del puesto. Las participaciones que ya se habían generado en procesos siguen vigentes y deben revocarse aparte (requiere la función de revocación pendiente).",
  };
}
