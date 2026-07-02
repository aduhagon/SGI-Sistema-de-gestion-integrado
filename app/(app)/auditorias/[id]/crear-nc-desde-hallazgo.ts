"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoNC } from "@/lib/api/ncs";

export type EstadoCrearNCDesdeHallazgo =
  | { ok: false; error: string }
  | null;

/**
 * Crea una no conformidad a partir de un hallazgo de auditoría, copiando sus
 * datos (título, descripción, proceso, requisito, severidad) y vinculando el
 * hallazgo a la NC. Redirige a la NC creada.
 *
 * Solo aplica a hallazgos de tipo no_conformidad_mayor / no_conformidad_menor
 * que todavía no tengan NC asociada.
 */
export async function crearNCDesdeHallazgo(
  hallazgoId: string,
): Promise<EstadoCrearNCDesdeHallazgo> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  // 1. Traer el hallazgo + el tipo de auditoría (para definir el origen de la NC).
  const { data: h, error: errH } = await supabase
    .from("hallazgos")
    .select(
      `id, tipo, titulo, descripcion, severidad, requisito_id, proceso_id, no_conformidad_id,
       auditorias:auditorias!hallazgos_auditoria_id_fkey ( tipo, estado )`,
    )
    .eq("id", hallazgoId)
    .maybeSingle();

  if (errH || !h) {
    return { ok: false, error: "No se encontró el hallazgo." };
  }

  // El tratamiento (crear la NC) recién se habilita con la auditoría cerrada.
  const estadoAud = (h as any).auditorias?.estado as string | undefined;
  if (estadoAud !== "cerrada") {
    return {
      ok: false,
      error:
        "El tratamiento de hallazgos se habilita cuando el auditor líder aprueba y cierra la auditoría.",
    };
  }

  // 2. Validaciones de negocio.
  const esNC = h.tipo === "no_conformidad_mayor" || h.tipo === "no_conformidad_menor";
  if (!esNC) {
    return {
      ok: false,
      error: "Solo se puede crear una NC desde hallazgos de tipo no conformidad.",
    };
  }
  if (h.no_conformidad_id) {
    // Ya tiene NC: redirigir a la existente en vez de crear otra.
    redirect(`/ncs/${h.no_conformidad_id}`);
  }

  // 3. Origen de la NC según el tipo de auditoría.
  const tipoAud = (h as any).auditorias?.tipo as string | undefined;
  const origen =
    tipoAud === "interna" ? "auditoria_interna" : "auditoria_externa";

  // 4. Mapear severidad del hallazgo a la de la NC (mismos valores alta/media/baja).
  const severidad =
    h.severidad === "alta" || h.severidad === "media" || h.severidad === "baja"
      ? h.severidad
      : "media";

  // 5. Crear la NC.
  const codigo = await generarCodigoNC();

  const { data: nc, error } = await supabase
    .from("no_conformidades")
    .insert({
      codigo,
      titulo: h.titulo,
      descripcion: h.descripcion,
      tipo: "no_conformidad",
      severidad,
      origen,
      hallazgo_id: h.id,
      requisito_id: h.requisito_id ?? null, // nullable: si el hallazgo no tenía, se completa luego
      proceso_id: h.proceso_id ?? null,
      estado: "abierta",
      responsable_tratamiento_id: usuarioId,
      creado_por: usuarioId,
    })
    .select("id")
    .single();

  if (error || !nc) {
    let msg = `No se pudo crear la no conformidad: ${error?.message ?? "desconocido"}`;
    if (error?.message.includes("chk_nc_auditoria_tiene_hallazgo"))
      msg = "La NC de auditoría necesita el hallazgo vinculado. Reintentá.";
    else if (error?.message.includes("chk_nc_codigo"))
      msg = "Error generando el código. Reintentá.";
    return { ok: false, error: msg };
  }

  // 6. Vincular el hallazgo a la NC creada.
  await supabase
    .from("hallazgos")
    .update({ no_conformidad_id: nc.id, estado: "en_tratamiento" })
    .eq("id", h.id);

  revalidatePath("/ncs");
  revalidatePath("/dashboard");

  // 7. Ir a la NC creada.
  redirect(`/ncs/${nc.id}?creada=1`);
}
