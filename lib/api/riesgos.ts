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
       responsable:usuarios!riesgos_responsable_id_fkey (
         username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)
       )`,
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
        responsableNombre: r.responsable?.personas
          ? `${r.responsable.personas.nombre} ${r.responsable.personas.apellido}`.trim()
          : r.responsable?.username ?? null,
        fechaRevision: r.fecha_revision,
        estado: r.estado,
      };
    })
    .sort((a, b) => b.nivelNumerico - a.nivelNumerico);
}

export type ProcesoOpcion = { id: string; nombre: string };
export type UsuarioOpcion = { id: string; nombre: string };

export async function obtenerDatosFormRiesgo(): Promise<{ procesos: ProcesoOpcion[]; usuarios: UsuarioOpcion[] }> {
  const supabase = createClient();
  const [procRes, usrRes] = await Promise.all([
    supabase.from("procesos").select("id, nombre").eq("activo", true).is("eliminado_en", null).order("nombre"),
    supabase
      .from("usuarios")
      .select("id, username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)")
      .eq("activo", true)
      .is("eliminado_en", null),
  ]);

  const procesos = ((procRes.data ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre }));
  const usuarios = ((usrRes.data ?? []) as any[])
    .map((u) => ({
      id: u.id,
      nombre: u.personas ? `${u.personas.nombre} ${u.personas.apellido}`.trim() : u.username,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { procesos, usuarios };
}
