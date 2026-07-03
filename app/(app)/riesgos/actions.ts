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

// Mitigantes que llegan del formulario como JSON en un input oculto.
// Solo viajan los datos de identidad; el resto vive en la base.
const mitigantesSchema = z
  .array(
    z.discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("documento"), documentoId: z.string().uuid() }),
      z.object({ tipo: z.literal("indicador"), indicadorId: z.string().uuid() }),
      z.object({ tipo: z.literal("otro"), descripcion: z.string().trim().min(5, "Describí el control con al menos 5 caracteres.").max(2000) }),
    ]),
  )
  .max(50);

type MitiganteDeseado = z.infer<typeof mitigantesSchema>[number];

const normasSchema = z.array(z.string().uuid()).max(20);

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

  // Mitigantes: si el campo no viene (formularios viejos en caché), se ignora
  // y no se toca nada. Si viene, se valida y se sincroniza tras guardar.
  let mitigantes: MitiganteDeseado[] | null = null;
  const mitigantesRaw = formData.get("mitigantes");
  if (typeof mitigantesRaw === "string" && mitigantesRaw !== "") {
    let json: unknown;
    try {
      json = JSON.parse(mitigantesRaw);
    } catch {
      return { ok: false, error: "Los mitigantes llegaron en un formato inválido. Recargá la página e intentá de nuevo." };
    }
    const parsedMit = mitigantesSchema.safeParse(json);
    if (!parsedMit.success) {
      return { ok: false, error: parsedMit.error.issues[0].message, campo: "mitigantes" };
    }
    mitigantes = parsedMit.data;
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

  if (mitigantes !== null) {
    const errorSync = await sincronizarMitigantes(supabase, riesgoId, mitigantes, usuarioId);
    if (errorSync) {
      // El riesgo ya se guardó; se informa el problema puntual de los vínculos.
      return { ok: false, error: `El riesgo se guardó, pero falló el vínculo de mitigantes: ${traducir(errorSync)}` };
    }
  }

  if (normas !== null) {
    const errorNorm = await sincronizarNormas(supabase, riesgoId, normas, usuarioId);
    if (errorNorm) {
      return { ok: false, error: `El riesgo se guardó, pero falló la asociación de normas: ${traducir(errorNorm)}` };
    }
  }

  revalidatePath("/riesgos");
  return { ok: true };
}

// Reconcilia los vínculos vivos contra lo que llegó del formulario:
// alta de los nuevos, baja lógica de los quitados, sin tocar los que siguen.
async function sincronizarMitigantes(
  supabase: ReturnType<typeof createClient>,
  riesgoId: string,
  deseados: MitiganteDeseado[],
  usuarioId: string,
): Promise<string | null> {
  const { data: actuales, error } = await supabase
    .from("riesgo_mitigante")
    .select("id, tipo_mitigante, documento_id, indicador_id, descripcion")
    .eq("riesgo_id", riesgoId)
    .eq("activo", true)
    .is("eliminado_en", null);
  if (error) return error.message;

  const claveActual = (a: { tipo_mitigante: string; documento_id: string | null; indicador_id: string | null; descripcion: string | null }) =>
    a.tipo_mitigante === "documento"
      ? `d:${a.documento_id}`
      : a.tipo_mitigante === "indicador"
        ? `i:${a.indicador_id}`
        : `o:${(a.descripcion ?? "").trim().toLowerCase()}`;

  const claveDeseada = (d: MitiganteDeseado) =>
    d.tipo === "documento" ? `d:${d.documentoId}` : d.tipo === "indicador" ? `i:${d.indicadorId}` : `o:${d.descripcion.trim().toLowerCase()}`;

  const clavesDeseadas = new Set(deseados.map(claveDeseada));
  const clavesActuales = new Set((actuales ?? []).map(claveActual));

  // Baja lógica de los que ya no están en el formulario.
  const aQuitar = (actuales ?? []).filter((a) => !clavesDeseadas.has(claveActual(a)));
  if (aQuitar.length > 0) {
    const { error: eBaja } = await supabase
      .from("riesgo_mitigante")
      .update({
        activo: false,
        eliminado_en: new Date().toISOString(),
        eliminado_por: usuarioId,
        eliminado_motivo: "Quitado desde el formulario del riesgo",
      })
      .in("id", aQuitar.map((a) => a.id));
    if (eBaja) return eBaja.message;
  }

  // Alta de los nuevos.
  const nuevos = deseados.filter((d) => !clavesActuales.has(claveDeseada(d)));
  if (nuevos.length > 0) {
    const filas = nuevos.map((d) => ({
      riesgo_id: riesgoId,
      tipo_mitigante: d.tipo,
      documento_id: d.tipo === "documento" ? d.documentoId : null,
      indicador_id: d.tipo === "indicador" ? d.indicadorId : null,
      descripcion: d.tipo === "otro" ? d.descripcion.trim() : null,
      creado_por: usuarioId,
    }));
    const { error: eAlta } = await supabase.from("riesgo_mitigante").insert(filas);
    if (eAlta) return eAlta.message;
  }

  return null;
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
  return { ok: true };
}

function traducir(msg: string): string {
  if (msg.includes("uq_riesgo_mitigante"))
    return "Ese documento o indicador ya está vinculado a este riesgo.";
  if (msg.includes("chk_riesgo_mitigante"))
    return "El mitigante es incoherente (tipo y referencia no coinciden).";
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
