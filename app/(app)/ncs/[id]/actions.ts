"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analisisCausaSchema } from "@/lib/schemas/nc";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoAnalisis =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function guardarAnalisisCausa(
  _estadoPrevio: EstadoAnalisis,
  formData: FormData,
): Promise<EstadoAnalisis> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida. Volvé a ingresar." };

  const parsed = analisisCausaSchema.safeParse({
    ncId: formData.get("ncId"),
    metodoAnalisis: formData.get("metodoAnalisis"),
    analisisCausaRaiz: formData.get("analisisCausaRaiz"),
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const { ncId, metodoAnalisis, analisisCausaRaiz } = parsed.data;

  // Al registrar el análisis, la NC pasa a 'en_analisis' si estaba 'abierta'.
  const { data: actual } = await supabase
    .from("no_conformidades")
    .select("estado")
    .eq("id", ncId)
    .maybeSingle();

  const nuevoEstado =
    actual?.estado === "abierta" ? "en_analisis" : (actual?.estado ?? "en_analisis");

  const { error } = await supabase
    .from("no_conformidades")
    .update({
      metodo_analisis: metodoAnalisis,
      analisis_causa_raiz: analisisCausaRaiz,
      estado: nuevoEstado,
      actualizado_en: new Date().toISOString(),
      actualizado_por: usuarioId,
    })
    .eq("id", ncId);

  if (error) {
    return { ok: false, error: `No se pudo guardar el análisis: ${error.message}` };
  }

  revalidatePath(`/ncs/${ncId}`);
  return { ok: true };
}
