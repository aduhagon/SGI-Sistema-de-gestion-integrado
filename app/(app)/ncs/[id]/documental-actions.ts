"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { revalidarMejora } from "@/lib/revalidar-mejora";
import { revalidatePath } from "next/cache";

const uuid = z.string().uuid();
export async function listarDocumentosCambio() {
  if (!await obtenerUsuarioActualId()) throw new Error("Sesión no válida.");
  const { data, error } = await createClient().from("documentos").select("id,codigo,titulo")
    .eq("activo", true).is("eliminado_en", null).order("codigo").limit(250);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarVersionesCambio(documentoId: string) {
  if (!uuid.safeParse(documentoId).success || !await obtenerUsuarioActualId()) throw new Error("Solicitud inválida.");
  const { data, error } = await createClient().from("versiones").select("id,numero_version,estado,es_vigente")
    .eq("documento_id", documentoId).eq("activo", true).is("eliminado_en", null).order("numero_orden", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function guardarCambioDocumental(input: { ncId: string; accionId: string; requiere: boolean; versionId: string | null }) {
  const parsed = z.object({ ncId: uuid, accionId: uuid, requiere: z.boolean(), versionId: uuid.nullable() }).safeParse(input);
  if (!parsed.success || !await obtenerUsuarioActualId()) return { ok: false as const, error: "Solicitud inválida." };
  const v = parsed.data;
  const { error } = await createClient().from("acciones").update({
    requiere_cambio_documental: v.requiere,
    version_documento_resultante_id: v.requiere ? v.versionId : null,
  }).eq("id", v.accionId).eq("no_conformidad_id", v.ncId).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  revalidarMejora(v.ncId);
  return { ok: true as const };
}

export async function crearBorradorCambio(ncId: string, accionId: string, documentoId: string) {
  if (![ncId, accionId, documentoId].every((v) => uuid.safeParse(v).success) || !await obtenerUsuarioActualId()) {
    return { ok: false as const, error: "Solicitud inválida." };
  }
  const supabase = createClient();
  const { data: accion, error: errorAccion } = await supabase.from("acciones").select("id")
    .eq("id", accionId).eq("no_conformidad_id", ncId).single();
  if (errorAccion || !accion) return { ok: false as const, error: "Acción no disponible." };
  const { error } = await supabase.rpc("fn_crear_borrador_accion", { p_accion: accionId, p_documento: documentoId });
  if (error) return { ok: false as const, error: error.message };
  revalidarMejora(ncId);
  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  return { ok: true as const };
}
