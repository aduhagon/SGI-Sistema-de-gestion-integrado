"use server";

import { createClient } from "@/lib/supabase/server";

export async function marcarNotificacionLeida(id: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .eq("id", id)
    .is("leida_en", null);
  return { ok: !error };
}

export async function marcarTodasLeidas(): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .is("leida_en", null)
    .is("archivada_en", null);
  return { ok: !error };
}

export async function archivarNotificacion(id: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ archivada_en: new Date().toISOString() })
    .eq("id", id);
  return { ok: !error };
}
