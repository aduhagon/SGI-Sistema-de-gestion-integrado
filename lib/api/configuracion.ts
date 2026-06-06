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
  gerenciaId: string | null;
  gerenciaNombre: string | null;
};

export async function listarAreas(): Promise<Area[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre, descripcion, area_padre_id")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("codigo", { ascending: true });
  if (error) return [];

  const filas = (data ?? []) as any[];
  // Mapa id -> nombre para resolver la gerencia (área padre) en memoria,
  // evitando el join autorreferente de PostgREST que es frágil.
  const nombrePorId = new Map<string, string>();
  for (const a of filas) nombrePorId.set(a.id, a.nombre);

  return filas.map((a) => ({
    id: a.id,
    codigo: a.codigo,
    nombre: a.nombre,
    descripcion: a.descripcion,
    gerenciaId: a.area_padre_id,
    gerenciaNombre: a.area_padre_id ? nombrePorId.get(a.area_padre_id) ?? null : null,
  }));
}

export async function listarGerencias(): Promise<
  Array<{ id: string; codigo: string; nombre: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .is("eliminado_en", null)
    .like("codigo", "GER-%")
    .order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []) as Array<{ id: string; codigo: string; nombre: string }>;
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
