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

  // Datos del vínculo antes de cerrarlo: necesitamos la persona.
  const { data: vinculo } = await supabase
    .from("persona_puesto")
    .select("persona_id")
    .eq("id", personaPuestoId)
    .maybeSingle();

  // Cerrar la vigencia del vínculo persona-puesto (SCD2).
  const { error } = await supabase
    .from("persona_puesto")
    .update({
      vigente_hasta: new Date().toISOString(),
      motivo_revocacion: "Quitada del puesto desde configuración",
    })
    .eq("id", personaPuestoId);

  if (error) return { ok: false, error: `No se pudo quitar: ${error.message}` };

  // Revocar las participaciones materializadas: buscar el usuario de la
  // persona y llamar a la función de revocación (SECURITY DEFINER).
  let revocadas = 0;
  let avisoExtra = "";
  if (vinculo?.persona_id) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("persona_id", vinculo.persona_id)
      .eq("activo", true)
      .is("eliminado_en", null)
      .maybeSingle();

    if (usuario) {
      const { data: cerradas, error: errRpc } = await supabase.rpc(
        "fn_revocar_participaciones_de_puesto",
        {
          p_usuario_id: usuario.id,
          p_puesto_id: puestoId,
          p_motivo: "Baja de puesto",
        },
      );
      if (errRpc) {
        avisoExtra =
          " No se pudieron revocar automáticamente las participaciones: " + errRpc.message;
      } else {
        revocadas = (cerradas as number) ?? 0;
      }
    }
  }

  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return {
    ok: true,
    aviso:
      revocadas > 0
        ? `Persona quitada del puesto. Se cerraron ${revocadas} participación(es) en procesos con fecha de hoy.`
        : "Persona quitada del puesto." + avisoExtra,
  };
}
