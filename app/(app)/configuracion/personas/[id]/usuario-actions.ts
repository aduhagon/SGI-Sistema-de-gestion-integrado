"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoUsuario =
  | { ok: true; mensaje: string; email: string; enlaceInvitacion: string | null }
  | { ok: false; error: string }
  | null;

export async function crearCuentaUsuario(
  _prev: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const supabase = createClient();

  const personaId = String(formData.get("personaId") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!personaId || !username || !email) {
    return { ok: false, error: "Completá username y email." };
  }

  // Invocar la Edge Function. El SDK adjunta el token del usuario actual,
  // que la función usa para verificar permisos (admin/SGI).
  const { data, error } = await supabase.functions.invoke("crear-usuario", {
    body: { personaId, username, email },
  });

  if (error) {
    let detalle = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const cuerpo = await ctx.json();
        if (cuerpo?.error) detalle = cuerpo.error;
      }
    } catch {
      // se queda con error.message
    }
    return { ok: false, error: detalle };
  }

  if (data?.error) {
    return { ok: false, error: data.error };
  }

  revalidatePath(`/configuracion/personas/${personaId}`);
  revalidatePath("/configuracion/personas");
  return {
    ok: true,
    mensaje: data?.mensaje ?? "Invitación enviada.",
    email: data?.email ?? email,
    enlaceInvitacion: data?.enlaceInvitacion ?? null,
  };
}
