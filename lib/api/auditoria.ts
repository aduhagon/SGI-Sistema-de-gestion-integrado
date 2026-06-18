"use server";

import { createClient } from "@/lib/supabase/server";

export type EventoAuditoria = {
  id: number;
  timestamp_utc: string;
  usuario_email: string | null;
  accion: string;
  entidad_tipo: string;
  entidad_id: string | null;
  descripcion: string | null;
};

export type DetalleEvento = EventoAuditoria & {
  usuario_id: string | null;
  datos_antes: unknown;
  datos_despues: unknown;
  ip_origen: string | null;
  user_agent: string | null;
  session_id: string | null;
  hash_propio: string | null;
  hash_anterior: string | null;
  metadata: unknown;
};

export type FiltrosAuditoria = {
  desde?: string | null;
  hasta?: string | null;
  usuario?: string | null;
  accion?: string | null;
  entidad?: string | null;
  limit?: number;
  offset?: number;
};

export type ResumenAuditoria = {
  total: number;
  usuarios: number;
  tipos_entidad: number;
  desde: string | null;
  hasta: string | null;
};

export type VerificacionCadena = {
  intacta: boolean;
  eventos_revisados: number;
  roto_en_id: number | null;
};

// Catálogos para los filtros (fijos, reflejan los enums de la base).
export const ACCIONES = [
  "crear", "modificar", "eliminar_logico", "restaurar", "aprobar", "rechazar",
  "firmar", "acusar_lectura", "descargar", "login", "logout", "configurar",
  "verificar_integridad",
] as const;

export async function listarEventos(
  f: FiltrosAuditoria,
): Promise<{ total: number; eventos: EventoAuditoria[] } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_auditoria_listar", {
    p_desde: f.desde ?? null,
    p_hasta: f.hasta ?? null,
    p_usuario: f.usuario ?? null,
    p_accion: f.accion ?? null,
    p_entidad: f.entidad ?? null,
    p_limit: f.limit ?? 50,
    p_offset: f.offset ?? 0,
  });
  if (error) return { error: error.message };
  const res = data as any;
  if (!res?.ok) return { error: res?.error ?? "Error al listar eventos." };
  return { total: res.total ?? 0, eventos: (res.eventos ?? []) as EventoAuditoria[] };
}

export async function obtenerDetalleEvento(
  id: number,
): Promise<DetalleEvento | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_auditoria_detalle", { p_id: id });
  if (error) return { error: error.message };
  const res = data as any;
  if (!res?.ok) return { error: res?.error ?? "Evento no encontrado." };
  return res.evento as DetalleEvento;
}

export async function obtenerResumen(): Promise<ResumenAuditoria | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_auditoria_resumen");
  if (error) return { error: error.message };
  const res = data as any;
  if (!res?.ok) return { error: res?.error ?? "Error al obtener el resumen." };
  return {
    total: res.total ?? 0,
    usuarios: res.usuarios ?? 0,
    tipos_entidad: res.tipos_entidad ?? 0,
    desde: res.desde ?? null,
    hasta: res.hasta ?? null,
  };
}

export async function verificarCadena(): Promise<VerificacionCadena | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_auditoria_verificar");
  if (error) return { error: error.message };
  const res = data as any;
  if (!res?.ok) return { error: res?.error ?? "Error al verificar la cadena." };
  return {
    intacta: !!res.intacta,
    eventos_revisados: res.eventos_revisados ?? 0,
    roto_en_id: res.roto_en_id ?? null,
  };
}
