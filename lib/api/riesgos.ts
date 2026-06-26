import { createClient } from "@/lib/supabase/server";
import {
  clasificarNivel,
  type NivelRiesgo,
  type GradoControl,
} from "@/lib/riesgos-utils";

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
  gradoControl: GradoControl;
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
       probabilidad, impacto, tipo_tratamiento, tratamiento_planificado, grado_control,
       responsable_id, fecha_revision, estado,
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
        gradoControl: r.grado_control ?? null,
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

// ── Árbol de riesgos por proceso ─────────────────────────────────────────────
// Un riesgo dentro del árbol (ya con residual calculado por la función SQL).
export type RiesgoArbol = {
  id: string;
  codigo: string;
  categoria: "riesgo" | "oportunidad";
  titulo: string;
  causa: string | null;
  consecuencia: string | null;
  probabilidad: number;
  impacto: number;
  inherente: number;
  residualNum: number;
  gradoControl: GradoControl;
  mitigante: string | null;
  estado: string;
};

export type NodoProcesoRiesgo = {
  procesoId: string;
  codigo: string;
  nombre: string;
  procesoPadreId: string | null;
  peorResidual: number;
  totalRiesgos: number;
  riesgos: RiesgoArbol[];
  hijos: NodoProcesoRiesgo[];
};

// Fila plana tal como la devuelve la RPC.
type FilaArbol = {
  proceso_id: string;
  codigo: string;
  nombre: string;
  proceso_padre_id: string | null;
  orden_visualizacion: number;
  peor_residual: number;
  total_riesgos: number;
  riesgos: RiesgoArbol[];
};

// Llama a la función SQL y arma el anidamiento padre/hijo en memoria
// (mismo patrón que listarPuestos: PostgREST no resuelve bien self-joins).
export async function obtenerArbolRiesgos(): Promise<NodoProcesoRiesgo[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_arbol_riesgos_por_proceso");
  if (error || !data) return [];

  const filas = data as FilaArbol[];

  // 1. Construir todos los nodos indexados por id
  const porId = new Map<string, NodoProcesoRiesgo>();
  for (const f of filas) {
    porId.set(f.proceso_id, {
      procesoId: f.proceso_id,
      codigo: f.codigo,
      nombre: f.nombre,
      procesoPadreId: f.proceso_padre_id,
      peorResidual: f.peor_residual,
      totalRiesgos: f.total_riesgos,
      riesgos: Array.isArray(f.riesgos) ? f.riesgos : [],
      hijos: [],
    });
  }

  // 2. Enganchar hijos a sus padres; recolectar raíces
  const raices: NodoProcesoRiesgo[] = [];
  for (const nodo of porId.values()) {
    if (nodo.procesoPadreId && porId.has(nodo.procesoPadreId)) {
      porId.get(nodo.procesoPadreId)!.hijos.push(nodo);
    } else {
      raices.push(nodo);
    }
  }

  // 3. Mostrar primero los procesos con más riesgos. Los vacíos van al final
  //    pero se conservan (un proceso sin riesgos también es información: nadie
  //    los identificó todavía).
  const ordenar = (ns: NodoProcesoRiesgo[]) => {
    ns.sort((a, b) => b.totalRiesgos - a.totalRiesgos || a.codigo.localeCompare(b.codigo));
    ns.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);

  return raices;
}
