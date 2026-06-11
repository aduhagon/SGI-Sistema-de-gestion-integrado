import { createClient } from "@/lib/supabase/server";
import { clasificarNivel, type NivelRiesgo } from "@/lib/riesgos-utils";

export type { NivelRiesgo };
export { clasificarNivel };

export type Riesgo = {
  id: string;
  codigo: string;
  procesoId: string;
  procesoNombre: string;
  categoria: "riesgo" | "oportunidad";
  titulo: string;
  descripcion: string | null;
  causa: string | null;
  consecuencia: string | null;
  probabilidad: number;
  impacto: number;
  nivelNumerico: number;
  nivel: NivelRiesgo;
  tipoTratamiento: string | null;
  tratamientoPlanificado: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  fechaRevision: string | null;
  estado: string;
};

// Clasificación del nivel: ver lib/riesgos-utils.ts

export async function listarRiesgos(procesoId?: string): Promise<Riesgo[]> {
  const supabase = createClient();
  let query = supabase
    .from("riesgos")
    .select(
      `id, codigo, proceso_id, categoria, titulo, descripcion, causa, consecuencia,
       probabilidad, impacto, tipo_tratamiento, tratamiento_planificado, responsable_id,
       fecha_revision, estado,
       proceso:procesos!riesgos_proceso_id_fkey (nombre),
       responsable:puestos!riesgos_responsable_id_fkey (codigo, nombre)`,
    )
    .eq("activo", true)
    .is("eliminado_en", null);
  if (procesoId) query = query.eq("proceso_id", procesoId);

  const { data, error } = await query;
  if (error) return [];

  return ((data ?? []) as any[])
    .map((r) => {
      const { numerico, nivel } = clasificarNivel(r.probabilidad, r.impacto);
      return {
        id: r.id,
        codigo: r.codigo,
        procesoId: r.proceso_id,
        procesoNombre: r.proceso?.nombre ?? "—",
        categoria: r.categoria,
        titulo: r.titulo,
        descripcion: r.descripcion,
        causa: r.causa,
        consecuencia: r.consecuencia,
        probabilidad: r.probabilidad,
        impacto: r.impacto,
        nivelNumerico: numerico,
        nivel,
        tipoTratamiento: r.tipo_tratamiento,
        tratamientoPlanificado: r.tratamiento_planificado,
        responsableId: r.responsable_id,
        responsableNombre: r.responsable?.nombre ?? null,
        fechaRevision: r.fecha_revision,
        estado: r.estado,
      };
    })
    .sort((a, b) => b.nivelNumerico - a.nivelNumerico);
}

export type ProcesoOpcion = { id: string; nombre: string };
export type PuestoOpcion = { id: string; nombre: string };

export async function obtenerDatosFormRiesgo(): Promise<{ procesos: ProcesoOpcion[]; puestos: PuestoOpcion[] }> {
  const supabase = createClient();
  const [procRes, puestoRes] = await Promise.all([
    supabase.from("procesos").select("id, nombre").eq("activo", true).is("eliminado_en", null).order("nombre"),
    supabase.from("puestos").select("id, codigo, nombre").eq("activo", true).is("eliminado_en", null).order("nombre"),
  ]);

  const procesos = ((procRes.data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre }));
  const puestos = ((puestoRes.data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre }));

  return { procesos, puestos };
}
