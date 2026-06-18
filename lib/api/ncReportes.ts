"use server";

import { createClient } from "@/lib/supabase/server";

export type NCOperativa = {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  severidad: string;
  origen: string;
  fechaApertura: string;
  fechaLimiteCierre: string | null;
  proceso: string | null;
  area: string | null;
  gerencia: string | null;
  requisitoClausula: string | null;
  requisitoTitulo: string | null;
  norma: string | null;
  vencida: boolean;
};

export async function obtenerNCsOperativas(
  desde?: string | null,
  hasta?: string | null,
): Promise<NCOperativa[] | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_nc_listado_operativo", {
    p_desde: desde ?? null,
    p_hasta: hasta ?? null,
  });
  if (error) return { error: error.message };
  const res = data as any;
  if (!res?.ok) return { error: res?.error ?? "No se pudo cargar el listado." };

  return ((res.ncs ?? []) as any[]).map((n) => ({
    id: n.id,
    codigo: n.codigo,
    titulo: n.titulo,
    estado: n.estado,
    severidad: n.severidad,
    origen: n.origen,
    fechaApertura: n.fecha_apertura,
    fechaLimiteCierre: n.fecha_limite_cierre,
    proceso: n.proceso ?? null,
    area: n.area ?? null,
    gerencia: n.gerencia ?? null,
    requisitoClausula: n.requisito_clausula ?? null,
    requisitoTitulo: n.requisito_titulo ?? null,
    norma: n.norma ?? null,
    vencida: !!n.vencida,
  }));
}
