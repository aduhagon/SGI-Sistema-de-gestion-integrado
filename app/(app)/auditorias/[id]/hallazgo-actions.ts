"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearHallazgoSchema } from "@/lib/schemas/hallazgo";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { generarCodigoHallazgo } from "@/lib/api/hallazgos";

export type EstadoHallazgo =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

function limpiarUuid(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string" || v === "") return undefined;
  return v;
}

export async function crearHallazgo(
  _estadoPrevio: EstadoHallazgo,
  formData: FormData,
): Promise<EstadoHallazgo> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = crearHallazgoSchema.safeParse({
    auditoriaId: formData.get("auditoriaId"),
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    evidencia: formData.get("evidencia") || undefined,
    severidad: formData.get("severidad") || undefined,
    requisitoId: formData.get("requisitoId") || undefined,
    procesoId: formData.get("procesoId") || undefined,
    documentoId: formData.get("documentoId") || undefined,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const input = parsed.data;

  // Traer el código de la auditoría para componer el código del hallazgo.
  const { data: aud } = await supabase
    .from("auditorias")
    .select("codigo")
    .eq("id", input.auditoriaId)
    .maybeSingle();

  if (!aud) {
    return { ok: false, error: "La auditoría no existe o no tenés acceso." };
  }

  const codigo = await generarCodigoHallazgo(input.auditoriaId, aud.codigo as string);

  const { error } = await supabase.from("hallazgos").insert({
    codigo,
    auditoria_id: input.auditoriaId,
    tipo: input.tipo,
    severidad: input.severidad ?? null,
    titulo: input.titulo,
    descripcion: input.descripcion,
    evidencia: input.evidencia ?? null,
    requisito_id: limpiarUuid(formData.get("requisitoId")) ?? null,
    proceso_id: limpiarUuid(formData.get("procesoId")) ?? null,
    documento_id: limpiarUuid(formData.get("documentoId")) ?? null,
    estado: "abierto",
    detectado_por_usuario_id: usuarioId,
    creado_por: usuarioId,
  });

  if (error) {
    const msg = error.message.includes("chk_hallazgos_codigo")
      ? "Error generando el código del hallazgo. Intentá de nuevo."
      : error.message.includes("severidad")
        ? "Las no conformidades requieren severidad; los demás tipos no la llevan."
        : `No se pudo registrar el hallazgo: ${error.message}`;
    return { ok: false, error: msg };
  }

  revalidatePath(`/auditorias/${input.auditoriaId}`);
  return { ok: true };
}
