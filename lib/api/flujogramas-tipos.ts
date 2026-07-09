// Tipos y helpers puros del módulo de flujogramas.
// SIN imports de servidor (next/headers) para que se pueda importar desde componentes cliente.

export type NivelFlujo = "proceso" | "subproceso" | "paso";
export type TipoBpmn = "inicio" | "tarea" | "decision" | "fin" | "subproceso_ref";
export type Marcador = "user" | "service" | "manual" | "sin_marcador";
export type EstadoGap = "rojo" | "amarillo" | "verde" | "sindatos";

export type NodoFlujo = {
  id: string;
  nivel: NivelFlujo;
  padreId: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  tipoBpmn: TipoBpmn | null;
  marcador: Marcador;
  puestoId: string | null;
  procesoId: string | null;
  orden: number;
  normativa: string | null;
  codRiesgo: string | null;
};

export type AristaFlujo = {
  id: string;
  origenId: string;
  destinoId: string;
  tipo: "secuencia" | "rama";
  etiqueta: string | null;
};

export type DataObject = {
  id: string;
  nodoId: string;
  direccion: "entrada" | "salida";
  etiqueta: string;
  documentoId: string | null;
};

export type PuestoRef = { id: string; codigo: string; nombre: string };

export type GapSubproceso = {
  procesoId: string;
  proceso: string;
  subprocesoId: string;
  subproceso: string;
  riesgos: number;
  controles: number;
  pasos: number;
  estado: EstadoGap;
  etiqueta: string;
};

// Salud a partir de riesgos/controles (regla del diseño DOC-SGI-DIS-001)
export function calcularEstado(riesgos: number, controles: number): { estado: EstadoGap; etiqueta: string } {
  if (riesgos > 0 && controles === 0) return { estado: "rojo", etiqueta: "Riesgo sin control" };
  if (riesgos > 0 && riesgos > controles * 2) return { estado: "amarillo", etiqueta: "Cobertura floja" };
  if (riesgos === 0 && controles === 0) return { estado: "sindatos", etiqueta: "Sin datos de riesgo" };
  return { estado: "verde", etiqueta: "Cobertura ok" };
}

// Peor hijo gana (para agregar el estado al proceso)
export function agregarEstado(estados: EstadoGap[]): EstadoGap {
  if (estados.includes("rojo")) return "rojo";
  if (estados.includes("amarillo")) return "amarillo";
  if (estados.includes("verde")) return "verde";
  return "sindatos";
}

// Detección de gaps por subproceso (función pura, sin acceso a datos)
export function calcularGaps(nodos: NodoFlujo[]): GapSubproceso[] {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const subs = nodos.filter((n) => n.nivel === "subproceso");
  const pasos = nodos.filter((n) => n.nivel === "paso");
  const out: GapSubproceso[] = [];
  for (const sp of subs) {
    const proc = sp.padreId ? porId.get(sp.padreId) : undefined;
    const hijos = pasos.filter((p) => p.padreId === sp.id);
    const riesgos = hijos.filter((p) => p.codRiesgo && p.codRiesgo.trim() !== "").length;
    const controles = hijos.filter((p) => p.tipoBpmn === "decision").length;
    const { estado, etiqueta } = calcularEstado(riesgos, controles);
    out.push({
      procesoId: proc?.id ?? "",
      proceso: proc?.titulo ?? "—",
      subprocesoId: sp.id,
      subproceso: sp.titulo,
      riesgos,
      controles,
      pasos: hijos.length,
      estado,
      etiqueta,
    });
  }
  return out.sort((a, b) => {
    const rank = (e: EstadoGap) => (e === "rojo" ? 0 : e === "amarillo" ? 1 : e === "verde" ? 2 : 3);
    return rank(a.estado) - rank(b.estado) || b.riesgos - a.riesgos;
  });
}
