import { createClient } from "@/lib/supabase/server";

export type PuestoDetalle = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  areaNombre: string | null;
};

export type RolEnProceso = {
  id: string;
  procesoId: string;
  procesoCodigo: string;
  procesoNombre: string;
  rol: string;
};

export async function obtenerPuesto(id: string): Promise<PuestoDetalle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("puestos")
    .select("id, codigo, nombre, descripcion, area_id")
    .eq("id", id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (error || !data) return null;

  let areaNombre: string | null = null;
  if (data.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("nombre")
      .eq("id", data.area_id)
      .maybeSingle();
    areaNombre = area?.nombre ?? null;
  }

  return {
    id: data.id,
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    areaNombre,
  };
}

export async function obtenerRolesDePuesto(puestoId: string): Promise<RolEnProceso[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("puesto_proceso_rol")
    .select(
      `id, rol_en_proceso, proceso_id,
       proceso:procesos!puesto_proceso_rol_proceso_id_fkey (codigo, nombre)`,
    )
    .eq("puesto_id", puestoId)
    .eq("activo", true)
    .order("rol_en_proceso", { ascending: true });
  if (error) return [];

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    procesoId: r.proceso_id,
    procesoCodigo: r.proceso?.codigo ?? "—",
    procesoNombre: r.proceso?.nombre ?? "—",
    rol: r.rol_en_proceso,
  }));
}

export async function obtenerProcesosParaSelector(): Promise<
  Array<{ id: string; codigo: string; nombre: string; tipo: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre, tipo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true });
  if (error) return [];
  return (data ?? []) as any[];
}
