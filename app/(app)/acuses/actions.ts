"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { firmarAcuseSchema } from "@/lib/schemas/acuse";
import { obtenerUsuarioActualId } from "@/lib/api/acuses";

export type EstadoFirma =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function firmarAcuse(
  _estadoPrevio: EstadoFirma,
  formData: FormData,
): Promise<EstadoFirma> {
  const supabase = createClient();

  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const parsed = firmarAcuseSchema.safeParse({
    acuseId: formData.get("acuseId"),
    confirmaLectura: formData.get("confirmaLectura") ?? false,
  });

  if (!parsed.success) {
    const primer = parsed.error.issues[0];
    return { ok: false, error: primer.message, campo: primer.path.join(".") };
  }

  const { acuseId } = parsed.data;

  // 1. Traer el acuse y validar que es del usuario y está pendiente.
  const { data: acuse, error: errAcuse } = await supabase
    .from("acuses_lectura")
    .select(
      `id, version_id, usuario_id, fecha_acuse,
       versiones:versiones!acuses_lectura_version_id_fkey (
         id, archivos ( tipo_archivo, hash_sha256 )
       )`,
    )
    .eq("id", acuseId)
    .maybeSingle();

  if (errAcuse || !acuse) {
    return { ok: false, error: "No se encontró el acuse o no tenés acceso." };
  }
  if (acuse.usuario_id !== usuarioId) {
    return { ok: false, error: "Este acuse no te corresponde." };
  }
  if (acuse.fecha_acuse) {
    return { ok: false, error: "Ya firmaste el acuse de este documento." };
  }

  const version = (acuse as any).versiones as
    | { id: string; archivos: Array<{ tipo_archivo: string; hash_sha256: string | null }> | null }
    | null;
  const hashPrincipal =
    version?.archivos?.find((a) => a.tipo_archivo === "principal")?.hash_sha256 ?? null;

  if (!hashPrincipal) {
    return {
      ok: false,
      error:
        "El documento no tiene un hash de archivo principal. No se puede firmar un acuse sin evidencia de integridad.",
    };
  }

  const ahora = new Date().toISOString();
  const hdrs = headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || null;
  const userAgent = hdrs.get("user-agent") ?? null;

  // 2. Crear la firma electrónica (tabla inmutable). entidad apunta al acuse.
  const { data: firma, error: errFirma } = await supabase
    .from("firmas_electronicas")
    .insert({
      tipo_firma: "simple",
      metodo_autenticacion: "supabase_password",
      firma_estado: "vigente",
      entidad_tipo: "acuse_lectura",
      entidad_id: acuseId,
      usuario_id: usuarioId,
      hash_documento_firmado: hashPrincipal,
      timestamp_firma: ahora,
      ip_origen: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (errFirma || !firma) {
    return {
      ok: false,
      error: `No se pudo registrar la firma: ${errFirma?.message ?? "desconocido"}`,
    };
  }

  // 3. Marcar el acuse como firmado, vinculando la firma.
  const { error: errUpd } = await supabase
    .from("acuses_lectura")
    .update({
      fecha_acuse: ahora,
      firma_id: firma.id,
    })
    .eq("id", acuseId);

  if (errUpd) {
    return {
      ok: false,
      error: `La firma se registró pero no se pudo cerrar el acuse: ${errUpd.message}`,
    };
  }

  revalidatePath("/acuses");
  revalidatePath("/dashboard");

  return { ok: true };
}
