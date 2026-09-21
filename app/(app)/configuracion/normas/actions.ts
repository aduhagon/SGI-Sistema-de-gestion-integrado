"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normaSchema } from "@/lib/schemas/configuracion";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoConfig =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarNorma(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = normaSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    nombreCorto: formData.get("nombreCorto"),
    nombreCompleto: formData.get("nombreCompleto"),
    descripcion: formData.get("descripcion") || undefined,
    organismoEmisor: formData.get("organismoEmisor") || undefined,
    sitioWeb: formData.get("sitioWeb") || undefined,
    ambito: formData.get("ambito") || undefined,
    estadoGestion: formData.get("estadoGestion") || undefined,
    estadoCertificacion: formData.get("estadoCertificacion") || undefined,
    certificadaPorMsu: formData.get("certificadaPorMsu") === "on",
    ordenVisualizacion: formData.get("ordenVisualizacion") || 0,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    codigo: i.codigo,
    nombre_corto: i.nombreCorto,
    nombre_completo: i.nombreCompleto,
    descripcion: limpio(i.descripcion),
    organismo_emisor: limpio(i.organismoEmisor),
    sitio_web: limpio(i.sitioWeb),
    ambito: limpio(i.ambito),
    estado_gestion: i.estadoGestion,
    estado_certificacion: i.estadoCertificacion,
    certificada_por_msu: i.certificadaPorMsu,
    orden_visualizacion: i.ordenVisualizacion,
  };

  if (esEdicion) {
    const { error } = await supabase
      .from("normas")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
  } else {
    const { error } = await supabase.from("normas").insert({ ...payload, creado_por: usuarioId });
    if (error) return { ok: false, error: traducir(error.message) };
  }

  revalidatePath("/configuracion/normas");
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarNorma(id: string): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("normas")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminada desde configuración",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/configuracion/normas");
  revalidatePath("/configuracion");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("normas_codigo_key") || msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe una norma con ese código.";
  if (msg.includes("chk_normas_codigo"))
    return "El código son 3 a 20 caracteres en mayúsculas y números.";
  if (msg.includes("chk_normas_sitio_web"))
    return "El sitio web debe empezar con http:// o https://";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar normas.";
  return `No se pudo guardar: ${msg}`;
}


const TIPOS_RELACION = new Set([
  "reglamenta",
  "complementa",
  "modifica",
  "sustituye",
  "deroga",
  "depende_de",
]);

export async function guardarRelacionNorma(
  _prev: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const normaOrigenId = String(formData.get("normaOrigenId") ?? "");
  const normaDestinoId = String(formData.get("normaDestinoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const limpio = (nombre: string) => {
    const valor = String(formData.get(nombre) ?? "").trim();
    return valor === "" ? null : valor;
  };

  if (!normaOrigenId || !normaDestinoId || normaOrigenId === normaDestinoId)
    return { ok: false, error: "Seleccioná una norma relacionada diferente." };
  if (!TIPOS_RELACION.has(tipo))
    return { ok: false, error: "Seleccioná un tipo de relación válido." };

  const { error } = await supabase.from("normas_relaciones").insert({
    norma_origen_id: normaOrigenId,
    norma_destino_id: normaDestinoId,
    tipo,
    articulos_afectados: limpio("articulosAfectados"),
    observacion: limpio("observacion"),
    fuente_url: limpio("fuenteUrl"),
    vigente_desde: limpio("vigenteDesde"),
    vigente_hasta: limpio("vigenteHasta"),
    creado_por: usuarioId,
  });

  if (error) {
    if (error.message.includes("uq_normas_relaciones_activas") || error.message.includes("duplicate"))
      return { ok: false, error: "Esta relación ya está registrada." };
    if (error.message.includes("chk_normas_relaciones_vigencia"))
      return { ok: false, error: "La fecha hasta no puede ser anterior a la fecha desde." };
    if (error.message.includes("chk_normas_relaciones_fuente"))
      return { ok: false, error: "La fuente debe comenzar con http:// o https://" };
    if (error.message.includes("row-level security") || error.message.includes("policy"))
      return { ok: false, error: "No tenés permisos para gestionar relaciones normativas." };
    return { ok: false, error: `No se pudo guardar la relación: ${error.message}` };
  }

  revalidatePath(`/configuracion/normas/${normaOrigenId}`);
  revalidatePath(`/configuracion/normas/${normaDestinoId}`);
  return { ok: true };
}

export async function eliminarRelacionNorma(
  relacionId: string,
  normaActualId: string,
): Promise<EstadoConfig> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { data: relacion } = await supabase
    .from("normas_relaciones")
    .select("norma_origen_id,norma_destino_id")
    .eq("id", relacionId)
    .maybeSingle();

  const { error } = await supabase
    .from("normas_relaciones")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Relación desactivada desde la ficha de norma",
      actualizado_por: usuarioId,
    })
    .eq("id", relacionId);

  if (error) return { ok: false, error: "No se pudo quitar la relación." };

  revalidatePath(`/configuracion/normas/${normaActualId}`);
  if (relacion?.norma_origen_id)
    revalidatePath(`/configuracion/normas/${relacion.norma_origen_id}`);
  if (relacion?.norma_destino_id)
    revalidatePath(`/configuracion/normas/${relacion.norma_destino_id}`);
  return { ok: true };
}
