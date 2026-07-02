"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearAuditoriaSchema } from "@/lib/schemas/auditoria";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoAuditoria } from "@/lib/api/auditorias";

export type EstadoCrearAuditoria =
  | { ok: true; auditoriaId: string }
  | { ok: false; error: string; campo?: string }
  | null;

export async function crearAuditoria(
  _estadoPrevio: EstadoCrearAuditoria,
  formData: FormData,
): Promise<EstadoCrearAuditoria> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = crearAuditoriaSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    tipo: formData.get("tipo"),
    fechaPlanificada: formData.get("fechaPlanificada"),
    entidadCertificadora: formData.get("entidadCertificadora") || undefined,
    objetivo: formData.get("objetivo") || undefined,
    alcanceGeneral: formData.get("alcanceGeneral") || undefined,
    criterios: formData.get("criterios") || undefined,
    normasIds: formData.getAll("normasIds").filter((v): v is string => typeof v === "string"),
    procesosIds: formData.getAll("procesosIds").filter((v): v is string => typeof v === "string"),
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const input = parsed.data;
  const codigo = await generarCodigoAuditoria();

  // 1. Crear la auditoría.
  const { data: auditoria, error: errAud } = await supabase
    .from("auditorias")
    .insert({
      codigo,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo,
      estado: "planificada",
      fecha_planificada: input.fechaPlanificada,
      entidad_certificadora: input.entidadCertificadora ?? null,
      objetivo: input.objetivo ?? null,
      alcance_general: input.alcanceGeneral ?? null,
      criterios: input.criterios ?? null,
      creado_por: usuarioId,
    })
    .select("id")
    .single();

  if (errAud || !auditoria) {
    const msg = errAud?.message.includes("chk_auditorias_codigo")
      ? "Error generando el código de la auditoría. Intentá de nuevo."
      : `No se pudo crear la auditoría: ${errAud?.message ?? "desconocido"}`;
    return { ok: false, error: msg };
  }

  // 2. Cargar el alcance: una fila por norma y una por proceso.
  const filasAlcance: Array<Record<string, unknown>> = [];
  for (const vn of input.normasIds) {
    filasAlcance.push({
      auditoria_id: auditoria.id,
      version_norma_id: vn,
      proceso_id: null,
      creado_por: usuarioId,
    });
  }
  for (const proc of input.procesosIds) {
    filasAlcance.push({
      auditoria_id: auditoria.id,
      version_norma_id: null,
      proceso_id: proc,
      creado_por: usuarioId,
    });
  }

  if (filasAlcance.length > 0) {
    const { error: errAlc } = await supabase.from("auditoria_alcance").insert(filasAlcance);
    if (errAlc) {
      // La auditoría ya se creó; informamos pero no abortamos.
      return {
        ok: false,
        error: `La auditoría se creó pero falló la carga del alcance: ${errAlc.message}`,
      };
    }
  }

  // 3. Sumar al creador como auditor líder del equipo (bootstrap del flujo).
  //    Si falla, no abortamos: puede asignarse manualmente desde el detalle.
  await supabase.from("auditoria_equipo").insert({
    auditoria_id: auditoria.id,
    usuario_id: usuarioId,
    rol_auditoria: "lider",
    creado_por: usuarioId,
  });

  revalidatePath("/auditorias");
  revalidatePath("/dashboard");
  redirect(`/auditorias/${auditoria.id}?creada=1`);
}
