"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { medicionSchema } from "@/lib/schemas/indicador";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoMedicion =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function registrarMedicion(
  _prev: EstadoMedicion,
  formData: FormData,
): Promise<EstadoMedicion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = medicionSchema.safeParse({
    indicadorId: formData.get("indicadorId"),
    periodo: formData.get("periodo"),
    valor: formData.get("valor"),
    comentario: formData.get("comentario") || undefined,
  });
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, error: p.message, campo: p.path.join(".") };
  }

  const i = parsed.data;
  const { error } = await supabase.from("mediciones_indicador").insert({
    indicador_id: i.indicadorId,
    periodo: i.periodo,
    valor: i.valor,
    comentario: i.comentario && i.comentario !== "" ? i.comentario : null,
    registrado_por: usuarioId,
  });

  if (error) {
    if (error.message.includes("uq_medicion_indicador_periodo") || error.message.includes("duplicate"))
      return { ok: false, error: "Ya hay una medición cargada para ese período. Editá la existente o elegí otro período." };
    if (error.message.includes("row-level security") || error.message.includes("policy"))
      return { ok: false, error: "No tenés permisos para registrar mediciones." };
    return { ok: false, error: `No se pudo registrar: ${error.message}` };
  }

  revalidatePath(`/indicadores/${i.indicadorId}`);
  revalidatePath("/indicadores");
  return { ok: true };
}

export async function eliminarMedicion(id: string, indicadorId: string): Promise<EstadoMedicion> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("mediciones_indicador")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminada desde el detalle del indicador",
    })
    .eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath(`/indicadores/${indicadorId}`);
  revalidatePath("/indicadores");
  return { ok: true };
}
