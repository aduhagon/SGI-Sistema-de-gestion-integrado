import { createClient } from "@/lib/supabase/server";

export type Notificacion = {
  id: string;
  tipo: string;
  prioridad: string;
  titulo: string;
  mensaje: string;
  urlDestino: string | null;
  leida: boolean;
  fechaEnvio: string;
};

// Notificaciones no archivadas del usuario actual (vía RLS), más recientes primero.
export async function listarNotificaciones(limite = 30): Promise<Notificacion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notificaciones")
    .select("id, tipo, prioridad, titulo, mensaje, url_destino, leida_en, fecha_envio")
    .is("archivada_en", null)
    .order("fecha_envio", { ascending: false })
    .limit(limite);
  if (error) return [];
  return ((data ?? []) as any[]).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    prioridad: n.prioridad,
    titulo: n.titulo,
    mensaje: n.mensaje,
    urlDestino: n.url_destino,
    leida: n.leida_en !== null,
    fechaEnvio: n.fecha_envio,
  }));
}

export async function contarNoLeidas(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .is("archivada_en", null)
    .is("leida_en", null);
  if (error) return 0;
  return count ?? 0;
}
