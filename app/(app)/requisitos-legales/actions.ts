"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import {
  requisitoLegalSchema,
  evaluacionCumplimientoSchema,
} from "@/lib/schemas/requisito-legal";

export type EstadoReqLegal =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

function traducir(msg: string): string {
  if (msg.includes("uq_requisitos_legales_codigo"))
    return "Ya existe un requisito legal con ese código.";
  if (msg.includes("uq_requisito_legal_proceso"))
    return "Ese requisito ya está vinculado a ese proceso.";
  if (msg.includes("uq_requisito_legal_norma"))
    return "Ese requisito ya está vinculado a esa norma.";
  if (msg.includes("row-level security") || msg.includes("violates row-level"))
    return "No tenés permisos para esta operación.";
  return `No se pudo completar la operación: ${msg}`;
}

const limpio = (v?: string | number | null) =>
  v === undefined || v === null || v === "" ? null : v;

export async function guardarRequisitoLegal(
  _prev: EstadoReqLegal,
  formData: FormData,
): Promise<EstadoReqLegal> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const procesosIds = formData
    .getAll("procesosIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const normasIds = formData
    .getAll("normasIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = requisitoLegalSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || "",
    tipo: formData.get("tipo"),
    jurisdiccion: formData.get("jurisdiccion") || "",
    organismoEmisor: formData.get("organismoEmisor") || "",
    referencia: formData.get("referencia") || "",
    fechaVigenciaDesde: formData.get("fechaVigenciaDesde") || "",
    urlFuente: formData.get("urlFuente") || "",
    criticidad: formData.get("criticidad") || "",
    observaciones: formData.get("observaciones") || "",
    procesosIds,
    normasIds,
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = !!(i.id && i.id !== "");

  const payload = {
    codigo: i.codigo,
    titulo: i.titulo,
    descripcion: limpio(i.descripcion),
    tipo: i.tipo,
    jurisdiccion: limpio(i.jurisdiccion),
    organismo_emisor: limpio(i.organismoEmisor),
    referencia: limpio(i.referencia),
    fecha_vigencia_desde: limpio(i.fechaVigenciaDesde),
    url_fuente: limpio(i.urlFuente),
    criticidad: limpio(i.criticidad),
    observaciones: limpio(i.observaciones),
  };

  let requisitoId: string;

  if (esEdicion) {
    const { error } = await supabase
      .from("requisitos_legales")
      .update({
        ...payload,
        actualizado_en: new Date().toISOString(),
        actualizado_por: usuarioId,
      })
      .eq("id", i.id!);
    if (error) return { ok: false, error: traducir(error.message) };
    requisitoId = i.id!;
  } else {
    const { data, error } = await supabase
      .from("requisitos_legales")
      .insert({ ...payload, creado_por: usuarioId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: traducir(error?.message ?? "desconocido") };
    requisitoId = data.id;
  }

  // Sincronizar vínculos a procesos (soft-delete de los que ya no están + alta de nuevos).
  const { data: actuales } = await supabase
    .from("requisito_legal_proceso")
    .select("id, proceso_id")
    .eq("requisito_legal_id", requisitoId)
    .is("eliminado_en", null);

  const actualesMap = new Map(
    ((actuales ?? []) as any[]).map((v) => [v.proceso_id as string, v.id as string]),
  );
  const deseados = new Set(i.procesosIds);

  // Bajas: los que estaban y ya no se quieren.
  for (const [procId, vincId] of actualesMap) {
    if (!deseados.has(procId)) {
      await supabase
        .from("requisito_legal_proceso")
        .update({
          eliminado_en: new Date().toISOString(),
          eliminado_por: usuarioId,
          eliminado_motivo: "Desvinculado al editar el requisito legal",
          activo: false,
        })
        .eq("id", vincId);
    }
  }

  // Altas: los nuevos que no estaban.
  const nuevos = i.procesosIds
    .filter((p) => !actualesMap.has(p))
    .map((p) => ({
      requisito_legal_id: requisitoId,
      proceso_id: p,
      creado_por: usuarioId,
    }));
  if (nuevos.length > 0) {
    const { error } = await supabase.from("requisito_legal_proceso").insert(nuevos);
    if (error) return { ok: false, error: traducir(error.message) };
  }

  // Sincronizar vínculos a normas (N:M). Mismo patrón: soft-delete + alta.
  const { data: normasActuales } = await supabase
    .from("requisito_legal_norma")
    .select("id, version_norma_id")
    .eq("requisito_legal_id", requisitoId)
    .is("eliminado_en", null);

  const normasActualesMap = new Map(
    ((normasActuales ?? []) as any[]).map((v) => [
      v.version_norma_id as string,
      v.id as string,
    ]),
  );
  const normasDeseadas = new Set(i.normasIds);

  // Bajas.
  for (const [verId, vincId] of normasActualesMap) {
    if (!normasDeseadas.has(verId)) {
      await supabase
        .from("requisito_legal_norma")
        .update({
          eliminado_en: new Date().toISOString(),
          eliminado_por: usuarioId,
          eliminado_motivo: "Desvinculada al editar el requisito legal",
          activo: false,
        })
        .eq("id", vincId);
    }
  }

  // Altas.
  const nuevasNormas = i.normasIds
    .filter((v) => !normasActualesMap.has(v))
    .map((v) => ({
      requisito_legal_id: requisitoId,
      version_norma_id: v,
      creado_por: usuarioId,
    }));
  if (nuevasNormas.length > 0) {
    const { error } = await supabase
      .from("requisito_legal_norma")
      .insert(nuevasNormas);
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/requisitos-legales");
  return { ok: true };
}

export async function eliminarRequisitoLegal(
  id: string,
  motivo: string,
): Promise<EstadoReqLegal> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };
  if (!motivo || motivo.trim().length < 3)
    return { ok: false, error: "Indicá un motivo para la eliminación." };

  const { error } = await supabase
    .from("requisitos_legales")
    .update({
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: motivo.trim(),
      activo: false,
    })
    .eq("id", id);
  if (error) return { ok: false, error: traducir(error.message) };

  revalidatePath("/requisitos-legales");
  return { ok: true };
}

export async function registrarEvaluacion(
  _prev: EstadoReqLegal,
  formData: FormData,
): Promise<EstadoReqLegal> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = evaluacionCumplimientoSchema.safeParse({
    requisitoLegalId: formData.get("requisitoLegalId"),
    procesoId: formData.get("procesoId") || "",
    estado: formData.get("estado"),
    evidencia: formData.get("evidencia") || "",
    fechaEvaluacion: formData.get("fechaEvaluacion"),
    proximaEvaluacion: formData.get("proximaEvaluacion") || "",
    observaciones: formData.get("observaciones") || "",
  });

  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;

  const { error } = await supabase.from("evaluaciones_cumplimiento").insert({
    requisito_legal_id: i.requisitoLegalId,
    proceso_id: limpio(i.procesoId),
    estado: i.estado,
    evidencia: limpio(i.evidencia),
    fecha_evaluacion: i.fechaEvaluacion,
    proxima_evaluacion: limpio(i.proximaEvaluacion),
    observaciones: limpio(i.observaciones),
    evaluado_por: usuarioId,
    creado_por: usuarioId,
  });

  if (error) return { ok: false, error: traducir(error.message) };

  revalidatePath("/requisitos-legales");
  return { ok: true };
}
