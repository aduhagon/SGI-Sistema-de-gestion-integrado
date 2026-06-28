"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { ZONAS_HORARIAS } from "@/lib/zonas-horarias";

export type EstadoAjustes =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function guardarZonaHoraria(
  _prev: EstadoAjustes,
  formData: FormData,
): Promise<EstadoAjustes> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const zona = String(formData.get("zona") ?? "");

  // Validar contra la lista blanca: nunca confiar en el valor del form.
  const valida = ZONAS_HORARIAS.some((z) => z.id === zona);
  if (!valida) return { ok: false, error: "Zona horaria no reconocida." };

  // El valor es jsonb: un string se guarda como JSON string.
  const { error } = await supabase
    .from("configuracion_sistema")
    .update({
      valor: zona,
      actualizado_en: new Date().toISOString(),
      actualizado_por: usuarioId,
    })
    .eq("clave", "zona_horaria");

  if (error) {
    // El caso típico si algo sale mal: RLS bloquea por no ser admin.
    if (error.message.toLowerCase().includes("row-level security")) {
      return { ok: false, error: "No tenés permisos para cambiar la configuración." };
    }
    return { ok: false, error: "No se pudo guardar la zona horaria." };
  }

  // Revalidar todo lo que muestra fechas calculadas con la zona.
  revalidatePath("/configuracion/ajustes");
  revalidatePath("/configuracion");
  revalidatePath("/ncs");
  return { ok: true };
}
