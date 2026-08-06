"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearReferenciaSchema } from "@/lib/schemas/referencia";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

/**
 * Server actions del referenciado normativo a nivel fragmento.
 *
 * Una referencia creada a mano nace en estado "aceptado" con validada_por:
 * la crea una persona con permiso, es la decisión misma. El estado "sugerido"
 * queda reservado para propuestas automáticas (capa de IA, futura).
 * La RLS restringe escritura a auditor/SGI; acá solo damos mensajes claros.
 */

export type EstadoReferencia =
  | { ok: true }
  | { ok: false; error: string }
  | null;

type CrearInput = {
  fragmentoId: string;
  requisitoId: string;
  tipo: "cita_norma" | "implementa" | "remite";
  documentoId: string;
  citaLiteral?: string;
};

export async function crearReferencia(input: CrearInput): Promise<EstadoReferencia> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = crearReferenciaSchema.safeParse({
    fragmentoId: input.fragmentoId,
    requisitoId: input.requisitoId,
    tipo: input.tipo,
    citaLiteral: input.citaLiteral || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { fragmentoId, requisitoId, tipo, citaLiteral } = parsed.data;
  const ahora = new Date().toISOString();

  // El índice único parcial es (fragmento, requisito, tipo) sobre no
  // eliminadas; si existe una eliminada lógicamente, se reactiva.
  const { data: existente } = await supabase
    .from("referencias_normativas")
    .select("id, eliminado_en")
    .eq("fragmento_id", fragmentoId)
    .eq("requisito_id", requisitoId)
    .eq("tipo", tipo)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente && !existente.eliminado_en) {
    return {
      ok: false,
      error: "Este bloque ya tiene esa referencia con el mismo tipo.",
    };
  }

  if (existente) {
    const { error } = await supabase
      .from("referencias_normativas")
      .update({
        activo: true,
        eliminado_en: null,
        eliminado_por: null,
        eliminado_motivo: null,
        estado: "aceptado",
        origen: "manual",
        cita_literal: citaLiteral ?? null,
        validada_por: usuarioId,
        validada_en: ahora,
        actualizado_en: ahora,
        actualizado_por: usuarioId,
      })
      .eq("id", existente.id);

    if (error) {
      return { ok: false, error: `No se pudo reactivar la referencia: ${error.message}` };
    }
  } else {
    const { error } = await supabase.from("referencias_normativas").insert({
      fragmento_id: fragmentoId,
      requisito_id: requisitoId,
      tipo,
      estado: "aceptado",
      origen: "manual",
      cita_literal: citaLiteral ?? null,
      validada_por: usuarioId,
      validada_en: ahora,
      creado_por: usuarioId,
    });

    if (error) {
      if (error.code === "42501") {
        return {
          ok: false,
          error: "No tenés permiso para crear referencias (solo auditor/SGI).",
        };
      }
      return { ok: false, error: `No se pudo crear la referencia: ${error.message}` };
    }
  }

  revalidatePath(`/documentos/${input.documentoId}/referencias`);
  revalidatePath("/busqueda-normativa");
  return { ok: true };
}

export async function eliminarReferencia(
  documentoId: string,
  referenciaId: string,
): Promise<EstadoReferencia> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida." };
  }

  const { error } = await supabase
    .from("referencias_normativas")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Desvinculada desde el referenciado del documento",
    })
    .eq("id", referenciaId);

  if (error) {
    return { ok: false, error: `No se pudo eliminar la referencia: ${error.message}` };
  }

  revalidatePath(`/documentos/${documentoId}/referencias`);
  revalidatePath("/busqueda-normativa");
  return { ok: true };
}
