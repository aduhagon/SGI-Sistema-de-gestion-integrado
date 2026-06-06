import { createClient } from "@/lib/supabase/server";

export type ConteosConfig = {
  usuarios: number;
  procesos: number;
  tipos: number;
  normas: number;
  areas: number;
  sedes: number;
  participaciones: number;
  politicas: number;
};

export async function obtenerConteosConfig(): Promise<ConteosConfig> {
  const supabase = createClient();

  const cuenta = async (tabla: string, filtro?: (q: any) => any) => {
    let q = supabase.from(tabla).select("id", { count: "exact", head: true });
    if (filtro) q = filtro(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [usuarios, procesos, tipos, normas, areas, sedes, participaciones, politicas] =
    await Promise.all([
      cuenta("usuarios", (q) => q.is("eliminado_en", null)),
      cuenta("procesos", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("tipos_documentales", (q) => q.eq("activo", true)),
      cuenta("normas", (q) => q.eq("activo", true)),
      cuenta("areas", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("sedes", (q) => q.eq("activo", true).is("eliminado_en", null)),
      cuenta("participacion_usuario_proceso", (q) => q.is("vigente_hasta", null)),
      cuenta("politicas_retencion"),
    ]);

  return { usuarios, procesos, tipos, normas, areas, sedes, participaciones, politicas };
}

// ---- Áreas ----
export type Area = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

export async function listarAreas(): Promise<Area[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre, descripcion")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];
  return (data ?? []) as Area[];
}

// ---- Sedes ----
export type Sede = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  localidad: string | null;
  provincia: string | null;
  pais: string | null;
  tipoSede: string | null;
  esSedePrincipal: boolean;
};

export async function listarSedes(): Promise<Sede[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("id, codigo, nombre, descripcion, localidad, provincia, pais, tipo_sede, es_sede_principal")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];
  return ((data ?? []) as any[]).map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    descripcion: s.descripcion,
    localidad: s.localidad,
    provincia: s.provincia,
    pais: s.pais,
    tipoSede: s.tipo_sede,
    esSedePrincipal: s.es_sede_principal,
  }));
}
