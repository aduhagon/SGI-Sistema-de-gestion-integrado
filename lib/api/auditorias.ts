import { createClient } from "@/lib/supabase/server";

export type AuditoriaLista = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  fechaPlanificada: string;
  entidadCertificadora: string | null;
  cantidadHallazgos: number;
};

export type NormaParaAlcance = {
  versionNormaId: string;
  codigo: string;
  nombreCorto: string;
  version: string;
};

export type ProcesoParaAlcance = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
};

export async function obtenerAuditorias(): Promise<AuditoriaLista[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auditorias")
    .select(
      `id, codigo, titulo, tipo, estado, fecha_planificada, entidad_certificadora,
       hallazgos ( id )`,
    )
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("fecha_planificada", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las auditorías: ${error.message}`);

  type Fila = {
    id: string;
    codigo: string;
    titulo: string;
    tipo: string;
    estado: string;
    fecha_planificada: string;
    entidad_certificadora: string | null;
    hallazgos: Array<{ id: string }> | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((a) => ({
    id: a.id,
    codigo: a.codigo,
    titulo: a.titulo,
    tipo: a.tipo,
    estado: a.estado,
    fechaPlanificada: a.fecha_planificada,
    entidadCertificadora: a.entidad_certificadora,
    cantidadHallazgos: a.hallazgos?.length ?? 0,
  }));
}

/** Genera el próximo código de auditoría con formato AUD-AAAA-NNN. */
export async function generarCodigoAuditoria(): Promise<string> {
  const supabase = createClient();
  const anio = new Date().getFullYear();
  const prefijo = `AUD-${anio}-`;

  const { data } = await supabase
    .from("auditorias")
    .select("codigo")
    .like("codigo", `${prefijo}%`)
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle();

  let proximo = 1;
  if (data?.codigo) {
    const partes = (data.codigo as string).split("-");
    const num = parseInt(partes[2] ?? "0", 10);
    if (!Number.isNaN(num)) proximo = num + 1;
  }

  return `${prefijo}${String(proximo).padStart(3, "0")}`;
}

export async function obtenerNormasParaAlcance(): Promise<NormaParaAlcance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("versiones_norma")
    .select(
      `id, version, es_version_actual,
       normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto, activo)`,
    )
    .eq("es_version_actual", true);

  if (error) throw new Error(`No se pudieron cargar las normas: ${error.message}`);

  type Fila = {
    id: string;
    version: string;
    normas: { codigo: string; nombre_corto: string; activo: boolean } | null;
  };

  return ((data ?? []) as unknown as Fila[])
    .filter((v) => v.normas?.activo)
    .map((v) => ({
      versionNormaId: v.id,
      codigo: v.normas!.codigo,
      nombreCorto: v.normas!.nombre_corto,
      version: v.version,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export async function obtenerProcesosParaAlcance(): Promise<ProcesoParaAlcance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre, tipo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden_visualizacion", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los procesos: ${error.message}`);
  return (data ?? []) as ProcesoParaAlcance[];
}
