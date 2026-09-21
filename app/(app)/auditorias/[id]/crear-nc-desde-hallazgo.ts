"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { revalidarMejora } from "@/lib/revalidar-mejora";

export type EstadoCrearNCDesdeHallazgo = { ok: false; error: string } | null;
export async function crearNCDesdeHallazgo(hallazgoId: string): Promise<EstadoCrearNCDesdeHallazgo> {
  if (!(await obtenerUsuarioActualId())) return { ok: false, error: "Sesión no válida." };
  if (!z.string().uuid().safeParse(hallazgoId).success) return { ok: false, error: "Hallazgo inválido." };
  const { data, error } = await createClient().rpc("fn_crear_nc_desde_hallazgo", { p_hallazgo_id: hallazgoId });
  if (error) return { ok: false, error: error.message };
  revalidarMejora(data as string);
  redirect(`/ncs/${data}?creada=1`);
}
