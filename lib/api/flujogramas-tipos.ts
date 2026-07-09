// Tipos y helpers puros del módulo de flujogramas.
// SIN imports de servidor (next/headers) para que se pueda importar desde componentes cliente.

export type NivelFlujo = "proceso" | "subproceso" | "paso";
export type TipoBpmn = "inicio" | "tarea" | "decision" | "fin" | "subproceso_ref";
export type Marcador = "user" | "service" | "manual" | "sin_marcador";
export type SubtipoEvento = "ninguno" | "mensaje" | "temporizador" | "senial" | "condicional" | "error" | "terminacion";
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
  subtipoEvento: SubtipoEvento;
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

// ─────────────────────────────────────────────────────────────
// Validador de estilo BPMN (método Bruce Silver)
// Regla principal: las tareas se nombran con VERBO EN INFINITIVO
// ("Registrar contrato", no "Registro de contrato").
// Detecta y sugiere; no cambia nada automáticamente.
// ─────────────────────────────────────────────────────────────

export type AvisoEstilo = {
  nodoId: string;
  titulo: string;
  regla: string;
  sugerencia: string | null;
};

// Sustantivos deverbales frecuentes → verbo infinitivo (para sugerir corrección)
const SUSTANTIVO_A_VERBO: Record<string, string> = {
  control: "Controlar", registro: "Registrar", solicitud: "Solicitar",
  análisis: "Analizar", analisis: "Analizar", cierre: "Cerrar",
  ingreso: "Ingresar", acondicionamiento: "Acondicionar", firma: "Firmar",
  "firma/aprobación": "Firmar/Aprobar", gestión: "Gestionar", gestion: "Gestionar",
  alta: "Dar de alta", negociación: "Negociar", negociacion: "Negociar",
  liquidación: "Liquidar", liquidacion: "Liquidar", cobro: "Cobrar",
  recepción: "Recibir", recepcion: "Recibir", autorización: "Autorizar",
  autorizacion: "Autorizar", despacho: "Despachar", entrega: "Entregar",
  evaluación: "Evaluar", evaluacion: "Evaluar", determinación: "Determinar",
  determinacion: "Determinar", emisión: "Emitir", emision: "Emitir",
  elección: "Elegir", eleccion: "Elegir", confección: "Confeccionar",
  confeccion: "Confeccionar", asignación: "Asignar", asignacion: "Asignar",
  búsqueda: "Buscar", busqueda: "Buscar", carga: "Cargar", pago: "Pagar",
  reclamo: "Reclamar", recopilación: "Recopilar", recopilacion: "Recopilar",
  seguimiento: "Hacer seguimiento de", oficialización: "Oficializar",
  conciliacion: "Conciliar", conciliación: "Conciliar", recupero: "Recuperar",
  producción: "Producir", produccion: "Producir", almacenamiento: "Almacenar",
  actualización: "Actualizar", actualizacion: "Actualizar", coordinación: "Coordinar",
  coordinacion: "Coordinar", precios: "Fijar precios", fijación: "Fijar", fijacion: "Fijar",
};

// ¿La primera palabra es un verbo infinitivo? (heurística español: termina en ar/er/ir)
function empiezaEnInfinitivo(titulo: string): boolean {
  const p = (titulo.trim().split(/\s+/)[0] || "").toLowerCase().replace(/[.,:;]/g, "");
  return /(ar|er|ir)$/.test(p) && p.length > 2;
}

function sugerirInfinitivo(titulo: string): string | null {
  const primera = (titulo.trim().split(/\s+/)[0] || "").toLowerCase().replace(/[.,:;]/g, "");
  const verbo = SUSTANTIVO_A_VERBO[primera];
  if (!verbo) return null;
  const resto = titulo.trim().split(/\s+/).slice(1).join(" ");
  // quitar "de/del/de la" inicial del resto para que quede natural
  const restoLimpio = resto.replace(/^(de\s+la|del|de|d[eo]s)\s+/i, "");
  return restoLimpio ? `${verbo} ${restoLimpio}` : verbo;
}

// Evalúa el estilo de un nodo. Solo aplica a tareas y decisiones.
export function evaluarEstiloNodo(nodo: NodoFlujo): AvisoEstilo | null {
  if (nodo.nivel !== "paso") return null;
  if (nodo.tipoBpmn === "tarea") {
    if (!empiezaEnInfinitivo(nodo.titulo)) {
      return {
        nodoId: nodo.id,
        titulo: nodo.titulo,
        regla: "Las tareas se nombran con verbo en infinitivo.",
        sugerencia: sugerirInfinitivo(nodo.titulo),
      };
    }
  }
  if (nodo.tipoBpmn === "decision") {
    // Las decisiones se nombran como pregunta
    if (!nodo.titulo.trim().includes("?")) {
      return {
        nodoId: nodo.id,
        titulo: nodo.titulo,
        regla: "Las decisiones (gateways) se nombran como pregunta.",
        sugerencia: `¿${nodo.titulo.trim()}?`,
      };
    }
  }
  return null;
}

export function evaluarEstiloLista(nodos: NodoFlujo[]): AvisoEstilo[] {
  const out: AvisoEstilo[] = [];
  for (const n of nodos) {
    const a = evaluarEstiloNodo(n);
    if (a) out.push(a);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Detección BPMN: tareas con divergencia/convergencia sin gateway
// En BPMN, si una tarea tiene 2+ salidas (o 2+ entradas) debería
// haber un gateway explícito. Una 'decision' YA es un gateway → ok.
// ─────────────────────────────────────────────────────────────

export type AristaLike = { origenId: string; destinoId: string };

// Devuelve los ids de tareas que tienen 2+ salidas sin ser gateway (decision).
export function tareasConDivergenciaSinGateway(nodos: NodoFlujo[], aristas: AristaLike[]): string[] {
  const salidasPorNodo = new Map<string, number>();
  for (const a of aristas) salidasPorNodo.set(a.origenId, (salidasPorNodo.get(a.origenId) ?? 0) + 1);
  const out: string[] = [];
  for (const n of nodos) {
    if (n.nivel !== "paso") continue;
    if (n.tipoBpmn === "decision") continue; // ya es gateway
    if ((salidasPorNodo.get(n.id) ?? 0) >= 2) out.push(n.id);
  }
  return out;
}

// Etiquetas legibles de subtipo de evento (para UI)
export const SUBTIPO_EVENTO_LABEL: Record<SubtipoEvento, string> = {
  ninguno: "Simple",
  mensaje: "Mensaje",
  temporizador: "Temporizador",
  senial: "Señal",
  condicional: "Condicional",
  error: "Error",
  terminacion: "Terminación",
};
