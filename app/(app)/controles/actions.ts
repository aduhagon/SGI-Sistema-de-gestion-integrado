"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { controlSchema, ejecucionControlSchema } from "@/lib/schemas/control";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoControlAction =
  | { ok: true; id?: string }
  | { ok: false; error: string; campo?: string }
  | null;

const listaIdsSchema = z.array(z.string().uuid()).max(200);

function leerListaIds(formData: FormData, nombre: string): string[] | null {
  const crudo = formData.get(nombre);
  if (typeof crudo !== "string") return null;
  try {
    const resultado = listaIdsSchema.safeParse(JSON.parse(crudo));
    if (!resultado.success) return null;
    return Array.from(new Set(resultado.data));
  } catch {
    return null;
  }
}

function revalidarControles() {
  revalidatePath("/controles");
  revalidatePath("/riesgos");
  revalidatePath("/procesos");
  revalidatePath("/mis-pendientes");
}

export async function guardarControl(
  _prev: EstadoControlAction,
  formData: FormData,
): Promise<EstadoControlAction> {
  if (!(await obtenerUsuarioActualId())) return { ok: false, error: "Sesión no válida." };

  const riesgoIds = leerListaIds(formData, "riesgoIds");
  const requisitoIds = leerListaIds(formData, "requisitoIds");
  const documentoIds = leerListaIds(formData, "documentoIds");
  const indicadorIds = leerListaIds(formData, "indicadorIds");
  if ([riesgoIds, requisitoIds, documentoIds, indicadorIds].some((valor) => valor === null)) {
    return { ok: false, error: "Los vínculos llegaron en un formato inválido. Recargá la página e intentá de nuevo." };
  }

  const parsed = controlSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    procesoId: formData.get("procesoId"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    objetivo: formData.get("objetivo") || undefined,
    tipo: formData.get("tipo"),
    periodicidad: formData.get("periodicidad"),
    responsablePuestoId: formData.get("responsablePuestoId") || undefined,
    instrucciones: formData.get("instrucciones") || undefined,
    requiereEvidencia: formData.get("requiereEvidencia") === "on",
    anticipacionDias: formData.get("anticipacionDias"),
    proximaEjecucion: formData.get("proximaEjecucion") || undefined,
    estado: formData.get("estado"),
    riesgoIds,
    requisitoIds,
    documentoIds,
    indicadorIds,
  });

  if (!parsed.success) {
    const problema = parsed.error.issues[0];
    return { ok: false, error: problema.message, campo: problema.path.join(".") };
  }

  const valor = parsed.data;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_guardar_control", {
    p_id: valor.id ?? null,
    p_codigo: valor.codigo,
    p_proceso_id: valor.procesoId,
    p_nombre: valor.nombre,
    p_descripcion: valor.descripcion || null,
    p_objetivo: valor.objetivo || null,
    p_tipo: valor.tipo,
    p_periodicidad: valor.periodicidad,
    p_responsable_puesto_id: valor.responsablePuestoId ?? null,
    p_instrucciones: valor.instrucciones || null,
    p_requiere_evidencia: valor.requiereEvidencia,
    p_anticipacion_dias: valor.anticipacionDias,
    p_proxima_ejecucion: valor.proximaEjecucion ?? null,
    p_estado: valor.estado,
    p_riesgo_ids: valor.riesgoIds,
    p_requisito_ids: valor.requisitoIds,
    p_documento_ids: valor.documentoIds,
    p_indicador_ids: valor.indicadorIds,
  });

  if (error) return { ok: false, error: traducir(error.message) };
  revalidarControles();
  return { ok: true, id: data as string };
}

export async function desactivarControl(id: string): Promise<EstadoControlAction> {
  if (!(await obtenerUsuarioActualId())) return { ok: false, error: "Sesión no válida." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Control inválido." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_desactivar_control", {
    p_control_id: id,
    p_motivo: "Retirado desde el módulo de controles",
  });
  if (error) return { ok: false, error: traducir(error.message) };
  if (!data) return { ok: false, error: "El control ya no está activo o no tenés permisos." };

  revalidarControles();
  return { ok: true };
}

export async function registrarEjecucionControl(
  _prev: EstadoControlAction,
  formData: FormData,
): Promise<EstadoControlAction> {
  if (!(await obtenerUsuarioActualId())) return { ok: false, error: "Sesión no válida." };

  const parsed = ejecucionControlSchema.safeParse({
    controlId: formData.get("controlId"),
    resultado: formData.get("resultado"),
    detalle: formData.get("detalle") || undefined,
    evidenciaDescripcion: formData.get("evidenciaDescripcion") || undefined,
    fechaProgramada: formData.get("fechaProgramada") || undefined,
  });
  if (!parsed.success) {
    const problema = parsed.error.issues[0];
    return { ok: false, error: problema.message, campo: problema.path.join(".") };
  }

  const valor = parsed.data;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_registrar_ejecucion_control", {
    p_control_id: valor.controlId,
    p_resultado: valor.resultado,
    p_detalle: valor.detalle || null,
    p_evidencia_descripcion: valor.evidenciaDescripcion || null,
    p_fecha_programada: valor.fechaProgramada ?? null,
  });

  if (error) return { ok: false, error: traducir(error.message) };
  revalidarControles();
  return { ok: true, id: data as string };
}

function traducir(mensaje: string): string {
  if (mensaje.includes("uq_controles_codigo") || mensaje.includes("duplicate key"))
    return "Ya existe un control con ese código.";
  if (mensaje.includes("fecha programada"))
    return "La fecha pendiente cambió. Recargá la página antes de registrar la ejecución.";
  if (mensaje.includes("evidencia")) return mensaje;
  if (mensaje.includes("row-level security") || mensaje.includes("permisos"))
    return "No tenés permisos para gestionar controles de este proceso.";
  return `No se pudo completar la operación: ${mensaje}`;
}
