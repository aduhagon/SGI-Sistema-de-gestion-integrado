"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { riesgoSchema } from "@/lib/schemas/riesgo";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoRiesgo =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

const normasSchema = z.array(z.string().uuid()).max(20);
const controlesSchema = z.array(z.string().uuid()).max(100);

export async function guardarRiesgo(
  _prev: EstadoRiesgo,
  formData: FormData,
): Promise<EstadoRiesgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = riesgoSchema.safeParse({
    id: formData.get("id") || undefined,
    codigo: formData.get("codigo"),
    procesoId: formData.get("procesoId"),
    categoria: formData.get("categoria"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    causa: formData.get("causa") || undefined,
    consecuencia: formData.get("consecuencia") || undefined,
    probabilidad: formData.get("probabilidad"),
    impacto: formData.get("impacto"),
    tipoTratamiento: formData.get("tipoTratamiento") || undefined,
    tratamientoPlanificado: formData.get("tratamientoPlanificado") || undefined,
    gradoControl: formData.get("gradoControl") || undefined,
    madurezControl: formData.get("madurezControl") || undefined,
    justificacionControl: formData.get("justificacionControl") || undefined,
    responsableId: formData.get("responsableId") || undefined,
    fechaRevision: formData.get("fechaRevision") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  // Los controles se definen en su modulo y aca solo se vinculan al riesgo.
  let controles: string[] | null = null;
  const controlesRaw = formData.get("controles");
  if (typeof controlesRaw === "string" && controlesRaw !== "") {
    let json: unknown;
    try {
      json = JSON.parse(controlesRaw);
    } catch {
      return { ok: false, error: "Los controles llegaron en un formato invalido. Recarga la pagina e intenta de nuevo." };
    }
    const parsedControles = controlesSchema.safeParse(json);
    if (!parsedControles.success) {
      return { ok: false, error: parsedControles.error.issues[0].message, campo: "controles" };
    }
    controles = Array.from(new Set(parsedControles.data));
  }

  // Normas asociadas (calificador opcional, N:M). Mismo criterio que mitigantes:
  // si el campo no viene, no se toca nada; si viene, se valida y reconcilia.
  let normas: string[] | null = null;
  const normasRaw = formData.get("normas");
  if (typeof normasRaw === "string" && normasRaw !== "") {
    let json: unknown;
    try {
      json = JSON.parse(normasRaw);
    } catch {
      return { ok: false, error: "Las normas llegaron en un formato inválido. Recargá la página e intentá de nuevo." };
    }
    const parsedNorm = normasSchema.safeParse(json);
    if (!parsedNorm.success) {
      return { ok: false, error: parsedNorm.error.issues[0].message, campo: "normas" };
    }
    normas = parsedNorm.data;
  }

  const i = parsed.data;
  const esEdicion = i.id && i.id !== "";
  const limpio = (v?: string) => (v && v !== "" ? v : null);

  const payload = {
    codigo: i.codigo,
    proceso_id: i.procesoId,
    categoria: i.categoria,
    titulo: i.titulo,
    descripcion: limpio(i.descripcion),
    causa: limpio(i.causa),
    consecuencia: limpio(i.consecuencia),
    probabilidad: i.probabilidad,
    impacto: i.impacto,
    tipo_tratamiento: limpio(i.tipoTratamiento),
    tratamiento_planificado: limpio(i.tratamientoPlanificado),
    grado_control: limpio(i.gradoControl),
    madurez_control: limpio(i.madurezControl),
    justificacion_control: limpio(i.justificacionControl),
    responsable_id: limpio(i.responsableId),
    fecha_revision: limpio(i.fechaRevision),
  };

  let riesgoId: string;
  if (esEdicion) {
    const { error } = await supabase
      .from("riesgos")
      .update({ ...payload, actualizado_en: new Date().toISOString(), actualizado_por: usuarioId })
      .eq("id", i.id);
    if (error) return { ok: false, error: traducir(error.message) };
    riesgoId = i.id as string;
  } else {
    const { data, error } = await supabase
      .from("riesgos")
      .insert({ ...payload, creado_por: usuarioId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: traducir(error?.message ?? "sin datos") };
    riesgoId = data.id as string;
  }

  if (controles !== null) {
    const errorSync = await sincronizarControles(supabase, riesgoId, controles);
    if (errorSync) {
      return { ok: false, error: `El riesgo se guardo, pero fallo el vinculo de controles: ${traducir(errorSync)}` };
    }
  }

  if (normas !== null) {
    const errorNorm = await sincronizarNormas(supabase, riesgoId, normas, usuarioId);
    if (errorNorm) {
      return { ok: false, error: `El riesgo se guardó, pero falló la asociación de normas: ${traducir(errorNorm)}` };
    }
  }

  revalidatePath("/riesgos");
  revalidatePath("/controles");
  revalidatePath("/procesos");
  return { ok: true };
}

async function sincronizarControles(
  supabase: ReturnType<typeof createClient>,
  riesgoId: string,
  deseados: string[],
): Promise<string | null> {
  const { error } = await supabase.rpc("fn_sincronizar_controles_riesgo", {
    p_riesgo_id: riesgoId,
    p_control_ids: deseados,
  });
  return error?.message ?? null;
}

// Reconcilia las normas asociadas al riesgo: alta de las nuevas, baja lógica de
// las quitadas, sin tocar las que siguen. Clave = version_norma_id.
async function sincronizarNormas(
  supabase: ReturnType<typeof createClient>,
  riesgoId: string,
  deseadas: string[],
  usuarioId: string,
): Promise<string | null> {
  const { data: actuales, error } = await supabase
    .from("riesgo_norma")
    .select("id, version_norma_id")
    .eq("riesgo_id", riesgoId)
    .eq("activo", true)
    .is("eliminado_en", null);
  if (error) return error.message;

  const deseadasSet = new Set(deseadas);
  const actualesSet = new Set((actuales ?? []).map((a) => a.version_norma_id));

  const aQuitar = (actuales ?? []).filter((a) => !deseadasSet.has(a.version_norma_id));
  if (aQuitar.length > 0) {
    const { error: eBaja } = await supabase
      .from("riesgo_norma")
      .update({
        activo: false,
        eliminado_en: new Date().toISOString(),
        eliminado_por: usuarioId,
        eliminado_motivo: "Quitada desde el formulario del riesgo",
      })
      .in("id", aQuitar.map((a) => a.id));
    if (eBaja) return eBaja.message;
  }

  const nuevas = deseadas.filter((v) => !actualesSet.has(v));
  if (nuevas.length > 0) {
    const filas = nuevas.map((v) => ({
      riesgo_id: riesgoId,
      version_norma_id: v,
      creado_por: usuarioId,
    }));
    const { error: eAlta } = await supabase.from("riesgo_norma").insert(filas);
    if (eAlta) return eAlta.message;
  }

  return null;
}

export async function eliminarRiesgo(id: string): Promise<EstadoRiesgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error: errorVinculos } = await supabase.rpc("fn_sincronizar_controles_riesgo", {
    p_riesgo_id: id,
    p_control_ids: [],
  });
  if (errorVinculos) {
    return { ok: false, error: `No se pudieron desvincular los controles: ${traducir(errorVinculos.message)}` };
  }

  const { error } = await supabase
    .from("riesgos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde el módulo de riesgos",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/riesgos");
  revalidatePath("/controles");
  revalidatePath("/procesos");
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("mismo proceso"))
    return "El control y el riesgo deben pertenecer al mismo proceso.";
  if (msg.includes("uq_riesgos_codigo") || msg.includes("duplicate") || msg.includes("unique"))
    return "Ya existe un riesgo con ese código.";
  if (msg.includes("chk_riesgos_codigo"))
    return "El código son 2 a 30 caracteres: mayúsculas, números, guion o guion bajo.";
  if (msg.includes("chk_riesgos_probabilidad") || msg.includes("chk_riesgos_impacto"))
    return "Probabilidad e impacto deben estar entre 1 y 5.";
  if (msg.includes("row-level security") || msg.includes("policy"))
    return "No tenés permisos para gestionar riesgos.";
  return `No se pudo guardar: ${msg}`;
}
