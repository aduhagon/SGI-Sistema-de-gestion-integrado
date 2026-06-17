"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export type EstadoRolGlobal =
  | { ok: true; mensaje?: string }
  | { ok: false; error: string }
  | null;

const asignarSchema = z.object({
  usuarioId: z.string().uuid("Elegí un usuario."),
  rolCodigo: z.string().min(1, "Elegí un rol."),
  motivo: z.string().min(5, "El motivo es obligatorio (mínimo 5 caracteres)."),
});

export async function asignarRolGlobal(
  _prev: EstadoRolGlobal,
  formData: FormData,
): Promise<EstadoRolGlobal> {
  const parsed = asignarSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    rolCodigo: formData.get("rolCodigo"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_asignar_rol_global", {
    p_usuario_id: parsed.data.usuarioId,
    p_rol_codigo: parsed.data.rolCodigo,
    p_motivo: parsed.data.motivo,
  });

  if (error) return { ok: false, error: `No se pudo asignar: ${error.message}` };

  const res = data as { ok: boolean; error?: string } | null;
  if (!res?.ok) {
    return { ok: false, error: res?.error ?? "No se pudo asignar el rol." };
  }

  revalidatePath("/configuracion/usuarios");
  revalidatePath("/configuracion");
  return { ok: true, mensaje: "Rol asignado correctamente." };
}

const revocarSchema = z.object({
  usuarioId: z.string().uuid(),
  rolCodigo: z.string().min(1),
  motivo: z.string().min(5, "El motivo es obligatorio (mínimo 5 caracteres)."),
});

export async function revocarRolGlobal(
  usuarioId: string,
  rolCodigo: string,
  motivo: string,
): Promise<EstadoRolGlobal> {
  const parsed = revocarSchema.safeParse({ usuarioId, rolCodigo, motivo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_revocar_rol_global", {
    p_usuario_id: parsed.data.usuarioId,
    p_rol_codigo: parsed.data.rolCodigo,
    p_motivo: parsed.data.motivo,
  });

  if (error) return { ok: false, error: `No se pudo revocar: ${error.message}` };

  const res = data as { ok: boolean; error?: string } | null;
  if (!res?.ok) {
    return { ok: false, error: res?.error ?? "No se pudo revocar el rol." };
  }

  revalidatePath("/configuracion/usuarios");
  revalidatePath("/configuracion");
  return { ok: true, mensaje: "Rol revocado correctamente." };
}
