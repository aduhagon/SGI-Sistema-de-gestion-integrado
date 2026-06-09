"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { politicaRetencionSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function crearPoliticaRetencion(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = politicaRetencionSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    tipoDocumentalId: formData.get("tipoDocumentalId") || undefined,
    normaId: formData.get("normaId") || undefined,
    procesoId: formData.get("procesoId") || undefined,
    criticidadAplicable: formData.get("criticidadAplicable") || undefined,
    aniosVersionesObsoletas: formData.get("aniosVersionesObsoletas"),
    aniosEventosAuditoria: formData.get("aniosEventosAuditoria"),
    aniosFirmas: formData.get("aniosFirmas"),
    aniosAcuses: formData.get("aniosAcuses"),
    aniosDocumentosInactivos: formData.get("aniosDocumentosInactivos") || undefined,
    politicaPurga: formData.get("politicaPurga"),
    fundamentoAprobacion: formData.get("fundamentoAprobacion") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const limpio = (v?: string | number) => (v === undefined || v === "" ? null : v);

  // La purga automática exige fundamento y aprobación formal.
  if (i.politicaPurga === "purga_automatica" && (!i.fundamentoAprobacion || i.fundamentoAprobacion === "")) {
    return {
      ok: false,
      error: "La purga automática requiere un fundamento de aprobación.",
      campo: "fundamentoAprobacion",
    };
  }

  const aprobacion =
    i.politicaPurga === "purga_automatica"
      ? { aprobada_por: usuarioId, aprobada_en: new Date().toISOString() }
      : {};

  const { error } = await supabase.from("politicas_retencion").insert({
    codigo: i.codigo,
    nombre: i.nombre,
    descripcion: limpio(i.descripcion),
    tipo_documental_id: limpio(i.tipoDocumentalId),
    norma_id: limpio(i.normaId),
    proceso_id: limpio(i.procesoId),
    criticidad_aplicable: limpio(i.criticidadAplicable),
    "años_retencion_versiones_obsoletas": i.aniosVersionesObsoletas,
    "años_retencion_eventos_auditoria": i.aniosEventosAuditoria,
    "años_retencion_firmas": i.aniosFirmas,
    "años_retencion_acuses": i.aniosAcuses,
    "años_retencion_documentos_inactivos": limpio(i.aniosDocumentosInactivos as any),
    politica_purga: i.politicaPurga,
    fundamento_aprobacion: limpio(i.fundamentoAprobacion),
    ...aprobacion,
    creado_por: usuarioId,
  });
  if (error) return { ok: false, error: traducir(error.message) };

  revalidatePath("/configuracion/retencion");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("chk_politicas_años_positivos"))
    return "Todos los plazos de retención deben ser números positivos.";
  if (msg.includes("chk_politicas_purga_automatica_aprobada"))
    return "La purga automática requiere aprobación formal.";
  if (msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe una política con ese código.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar políticas de retención.";
  return `No se pudo guardar: ${msg}`;
}
