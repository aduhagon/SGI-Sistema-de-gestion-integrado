import { createClient } from "@/lib/supabase/server";

/**
 * Acuses de lectura pendientes (sin firmar) agrupados por usuario.
 * Usa la RPC fn_acuses_pendientes_por_usuario.
 */

export type AcusePendiente = {
  acuse_id: string;
  documento_id: string;
  codigo: string;
  titulo: string;
  numero_version: string;
  fecha_generacion: string;
  plazo_objetivo: string | null;
  vencido: boolean;
  recordatorios: number;
};

export type UsuarioConPendientes = {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  email: string | null;
  totalPendientes: number;
  vencidos: number;
  acuses: AcusePendiente[];
};

export async function obtenerAcusesPendientesPorUsuario(): Promise<
  UsuarioConPendientes[]
> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_acuses_pendientes_por_usuario");

  if (error || !data) return [];

  type Fila = {
    usuario_id: string;
    username: string;
    nombre_completo: string;
    email: string | null;
    total_pendientes: number;
    vencidos: number;
    acuses: AcusePendiente[];
  };

  return (data as Fila[]).map((f) => ({
    usuarioId: f.usuario_id,
    username: f.username,
    nombreCompleto: f.nombre_completo,
    email: f.email,
    totalPendientes: f.total_pendientes,
    vencidos: f.vencidos,
    acuses: f.acuses ?? [],
  }));
}
