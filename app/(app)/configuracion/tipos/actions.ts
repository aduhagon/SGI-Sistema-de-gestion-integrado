"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tipoDocumentalSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarTipoDocumental(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = tipoDocumentalSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    nombrePlural: formData.get("nombrePlural"),
    descripcion: formData.get("descripcion") || undefined,
    requiereAprobacion: formData.get("requiereAprobacion") === "on",
    requiereSegundoNivel: formData.get("requiereSegundoNivel") === "on",
    nivelN1: formData.get("nivelN1") || undefined,
    nivelN2: formData.get("nivelN2") || undefined,
    nivelRevisor: formData.get("nivelRevisor") || undefined,
    requiereAcuseLectura: formData.get("requiereAcuseLectura") === "on",
    frecuenciaRevisionDefault: formData.get("frecuenciaRevisionDefault") || undefined,
    criticidadDefault: formData.get("criticidadDefault") || undefined,
    confidencialidadDefault: formData.get("confidencialidadDefault") || undefined,
    ordenVisualizacion: formData.get("ordenVisualizacion") || 0,
    nivelJerarquico: formData.get("nivelJerarquico") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string | number) =>
    v === undefined || v === "" ? null : v;

  // Determinar los niveles de la regla según los checkboxes:
  //   - sin aprobación  -> nivelN1 = null (no hay regla)
  //   - un nivel        -> nivelN1 set, nivelN2 = null
  //   - dos niveles     -> nivelN1 set, nivelN2 set
  const reglaN1 = i.requiereAprobacion ? (limpio(i.nivelN1) as string | null) : null;
  const reglaN2 =
    i.requiereAprobacion && i.requiereSegundoNivel
      ? (limpio(i.nivelN2) as string | null)
      : null;
  const reglaRevisor = i.requiereAprobacion ? (limpio(i.nivelRevisor) as string | null) : null;

  // Validaciones de coherencia de la regla (la función SQL también las protege).
  if (i.requiereAprobacion && !reglaN1) {
    return { ok: false, error: "Elegí el nivel jerárquico del primer aprobador.", campo: "nivelN1" };
  }
  if (i.requiereAprobacion && i.requiereSegundoNivel && !reglaN2) {
    return { ok: false, error: "Elegí el nivel jerárquico del segundo aprobador.", campo: "nivelN2" };
  }

  const payload = {
    codigo: i.codigo,
    nombre: i.nombre,
    nombre_plural: i.nombrePlural,
    descripcion: limpio(i.descripcion),
    requiere_aprobacion: i.requiereAprobacion,
    requiere_acuse_lectura: i.requiereAcuseLectura,
    frecuencia_revision_default: limpio(i.frecuenciaRevisionDefault) ?? "anual",
    criticidad_default: limpio(i.criticidadDefault) ?? "medio",
    confidencialidad_default: limpio(i.confidencialidadDefault) ?? "interno",
    orden_visualizacion: i.ordenVisualizacion,
    nivel_jerarquico: limpio(i.nivelJerarquico as any),
  };

  let tipoId: string | null = esEdicion ? (i.id as string) : null;

  if (esEdicion) {
    const { error } = await supabase
      .from("tipos_documentales")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { data, error } = await supabase
      .from("tipos_documentales")
      .insert({ ...payload, creado_por: usuarioId })
      .select("id")
      .single();
    if (error) return { ok: false, error: traducir(error.message) };
    tipoId = (data?.id as string) ?? null;
  }

  // Sincronizar la regla de aprobación de forma coherente (única fuente de verdad
  // de los niveles). fn_set_regla_aprobacion también ajusta requiere_aprobacion.
  if (tipoId) {
    const { error: errRegla } = await supabase.rpc("fn_set_regla_aprobacion", {
      p_tipo_id: tipoId,
      p_nivel_revisor: reglaRevisor,
      p_nivel_n1: reglaN1,
      p_nivel_n2: reglaN2,
      p_nota: null,
    });
    if (errRegla) {
      return { ok: false, error: `Se guardó el tipo pero falló la regla de aprobación: ${errRegla.message}` };
    }
  }

  revalidatePath("/configuracion/tipos");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarTipoDocumental(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("tipos_documentales")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/tipos");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("codigo_key"))
    return "Ya existe un tipo documental con ese código.";
  if (msg.includes("chk_tipos_doc_codigo"))
    return "El código debe ser de 2 a 5 letras mayúsculas.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar tipos documentales.";
  return `No se pudo guardar: ${msg}`;
}
