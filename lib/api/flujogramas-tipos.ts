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

// ─────────────────────────────────────────────────────────────
// Detección de secuencia rota (pasos sueltos, sin salida/entrada, duplicados)
// ─────────────────────────────────────────────────────────────

export type ProblemaConexion = {
  nodoId: string;
  codigo: string | null;
  titulo: string;
  tipo: "suelto" | "sin_salida" | "sin_entrada" | "duplicada";
  detalle: string;
};

export type SubprocesoConProblemas = {
  subprocesoId: string;
  subproceso: string;
  proceso: string;
  problemas: ProblemaConexion[];
};

export function detectarSecuenciaRota(
  nodos: NodoFlujo[],
  aristas: AristaLike[]
): SubprocesoConProblemas[] {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const salidas = new Map<string, number>();
  const entradas = new Map<string, number>();
  const paresVistos = new Map<string, number>();
  for (const a of aristas) {
    salidas.set(a.origenId, (salidas.get(a.origenId) ?? 0) + 1);
    entradas.set(a.destinoId, (entradas.get(a.destinoId) ?? 0) + 1);
    const clave = a.origenId + "→" + a.destinoId;
    paresVistos.set(clave, (paresVistos.get(clave) ?? 0) + 1);
  }
  // pares duplicados por nodo origen
  const dupPorOrigen = new Map<string, string[]>();
  for (const [clave, veces] of paresVistos) {
    if (veces > 1) {
      const origen = clave.split("→")[0];
      const arr = dupPorOrigen.get(origen) ?? [];
      arr.push(clave);
      dupPorOrigen.set(origen, arr);
    }
  }

  const porSub = new Map<string, ProblemaConexion[]>();
  for (const n of nodos) {
    if (n.nivel !== "paso" || !n.padreId) continue;
    const s = salidas.get(n.id) ?? 0;
    const e = entradas.get(n.id) ?? 0;
    const probs: ProblemaConexion[] = [];
    if (s === 0 && e === 0) {
      probs.push({ nodoId: n.id, codigo: n.codigo, titulo: n.titulo, tipo: "suelto", detalle: "Sin conexiones (aislado)" });
    } else {
      if (n.tipoBpmn !== "fin" && s === 0) {
        probs.push({ nodoId: n.id, codigo: n.codigo, titulo: n.titulo, tipo: "sin_salida", detalle: "No lleva a ningún paso" });
      }
      if (n.tipoBpmn !== "inicio" && e === 0) {
        probs.push({ nodoId: n.id, codigo: n.codigo, titulo: n.titulo, tipo: "sin_entrada", detalle: "Ningún paso llega a este (inalcanzable)" });
      }
    }
    if (dupPorOrigen.has(n.id)) {
      probs.push({ nodoId: n.id, codigo: n.codigo, titulo: n.titulo, tipo: "duplicada", detalle: "Tiene conexiones duplicadas al mismo destino" });
    }
    if (probs.length > 0) {
      const arr = porSub.get(n.padreId) ?? [];
      arr.push(...probs);
      porSub.set(n.padreId, arr);
    }
  }

  const out: SubprocesoConProblemas[] = [];
  for (const [subId, problemas] of porSub) {
    const sub = porId.get(subId);
    const proc = sub?.padreId ? porId.get(sub.padreId) : undefined;
    out.push({
      subprocesoId: subId,
      subproceso: sub?.titulo ?? "—",
      proceso: proc?.titulo ?? "—",
      problemas,
    });
  }
  return out.sort((a, b) => b.problemas.length - a.problemas.length);
}

export const PROBLEMA_LABEL: Record<ProblemaConexion["tipo"], string> = {
  suelto: "Suelto",
  sin_salida: "Sin salida",
  sin_entrada: "Sin entrada",
  duplicada: "Duplicada",
};

// ─────────────────────────────────────────────────────────────
// Geometría de conexión: punto donde una línea toca el BORDE REAL
// de un nodo según su forma (rombo / círculo / rectángulo).
// x,y = esquina sup-izq del bounding box; w,h = tamaño; fromX,fromY = de dónde viene la línea.
// ─────────────────────────────────────────────────────────────

export type FormaNodo = "rombo" | "circulo" | "rect";

export function formaDeNodo(tipoBpmn: TipoBpmn | null): FormaNodo {
  if (tipoBpmn === "decision") return "rombo";
  if (tipoBpmn === "inicio" || tipoBpmn === "fin") return "circulo";
  return "rect";
}

// Punto de contacto en el borde del nodo según su forma y la dirección de la línea.
// - rombo: SIEMPRE uno de los 4 vértices (BPMN: gateways conectan por vértices).
// - rect (tarea): SIEMPRE el centro de uno de los 4 lados.
// - circulo (evento): la circunferencia.
export function puntoContacto(
  forma: FormaNodo, x: number, y: number, w: number, h: number, fromX: number, fromY: number
): { px: number; py: number } {
  const cx = x + w / 2, cy = y + h / 2;
  const ux = fromX - cx, uy = fromY - cy; // dirección centro → origen de la línea
  const horizontal = Math.abs(ux) >= Math.abs(uy);

  if (forma === "rombo") {
    // 4 vértices; elegir el más alineado con la dirección predominante
    if (horizontal) return { px: cx + (ux >= 0 ? w / 2 : -w / 2), py: cy };
    return { px: cx, py: cy + (uy >= 0 ? h / 2 : -h / 2) };
  }
  if (forma === "rect") {
    // centro del lado según dirección predominante
    if (horizontal) return { px: cx + (ux >= 0 ? w / 2 : -w / 2), py: cy };
    return { px: cx, py: cy + (uy >= 0 ? h / 2 : -h / 2) };
  }
  // circulo: circunferencia en la dirección exacta
  let dx = ux, dy = uy;
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const r = Math.min(w, h) / 2 - 1;
  return { px: cx + dx * r, py: cy + dy * r };
}

// Clasifica una etiqueta de rama como "feliz" (positiva) o "desvio" (negativa) o null (sin datos).
export function claseRama(etiqueta: string | null): "feliz" | "desvio" | null {
  if (!etiqueta) return null;
  const e = etiqueta.trim().toLowerCase();
  const positivas = ["si", "sí", "aprobado", "aprueba", "ok", "coincide", "conforme", "correcto", "cumple", "aceptado"];
  const negativas = ["no", "rechazado", "rechaza", "difiere", "error", "incorrecto", "no cumple", "no conforme", "rechazo"];
  if (positivas.some((p) => e === p || e.startsWith(p))) return "feliz";
  if (negativas.some((n) => e === n || e.startsWith(n))) return "desvio";
  return null;
}

// ─────────────────────────────────────────────────────────────
// Ruteo ORTOGONAL (Manhattan): solo tramos horizontales y verticales,
// codos en ángulo recto, entrada perpendicular al nodo. Sin diagonales.
// ─────────────────────────────────────────────────────────────

export type LadoContacto = "izq" | "der" | "arriba" | "abajo";

// Igual que puntoContacto pero además informa por qué lado sale/entra la línea,
// para poder rutear perpendicular a ese lado.
export function contactoConLado(
  forma: FormaNodo, x: number, y: number, w: number, h: number, haciaX: number, haciaY: number
): { px: number; py: number; lado: LadoContacto } {
  const cx = x + w / 2, cy = y + h / 2;
  const ux = haciaX - cx, uy = haciaY - cy;
  const horizontal = Math.abs(ux) >= Math.abs(uy);
  if (horizontal) {
    return ux >= 0
      ? { px: x + w, py: cy, lado: "der" }
      : { px: x, py: cy, lado: "izq" };
  }
  return uy >= 0
    ? { px: cx, py: y + h, lado: "abajo" }
    : { px: cx, py: y, lado: "arriba" };
}

// Construye un path SVG ortogonal entre salida (con su lado) y llegada (con su lado).
// stub = cuánto se aleja perpendicular del nodo antes de doblar.
export function pathOrtogonal(
  sx: number, sy: number, sLado: LadoContacto,
  ex: number, ey: number, eLado: LadoContacto,
  stub = 22, canal = 0
): string {
  // 'canal' desplaza el tramo intermedio para que líneas paralelas no se superpongan.
  const off = canal * 10;
  const p1 = avanzar(sx, sy, sLado, stub);
  const p2 = avanzar(ex, ey, eLado, stub);

  const pts: [number, number][] = [[sx, sy], [p1.x, p1.y]];
  const saleHorizontal = sLado === "izq" || sLado === "der";
  const entraHorizontal = eLado === "izq" || eLado === "der";

  if (saleHorizontal && entraHorizontal) {
    const midX = (p1.x + p2.x) / 2 + off; // desplazar el tramo vertical del medio
    pts.push([midX, p1.y], [midX, p2.y]);
  } else if (!saleHorizontal && !entraHorizontal) {
    const midY = (p1.y + p2.y) / 2 + off; // desplazar el tramo horizontal del medio
    pts.push([p1.x, midY], [p2.x, midY]);
  } else if (saleHorizontal && !entraHorizontal) {
    pts.push([p2.x, p1.y]);
  } else {
    pts.push([p1.x, p2.y]);
  }

  pts.push([p2.x, p2.y], [ex, ey]);
  return "M " + pts.map(([px, py]) => `${Math.round(px)} ${Math.round(py)}`).join(" L ");
}

// Asigna un número de canal a cada arista para separar las que comparten origen o destino.
// Devuelve un Map aristaId → canal (…-1, 0, 1…) centrado en 0.
export function asignarCanales(aristas: { id: string; origenId: string; destinoId: string }[]): Map<string, number> {
  const canal = new Map<string, number>();
  // agrupar por par de nodos involucrados (mismo tramo probable)
  const porOrigen = new Map<string, string[]>();
  for (const a of aristas) {
    const arr = porOrigen.get(a.origenId) ?? [];
    arr.push(a.id);
    porOrigen.set(a.origenId, arr);
  }
  for (const [, ids] of porOrigen) {
    const n = ids.length;
    ids.forEach((id, i) => canal.set(id, i - (n - 1) / 2)); // centrado en 0
  }
  return canal;
}

function avanzar(x: number, y: number, lado: LadoContacto, d: number): { x: number; y: number } {
  switch (lado) {
    case "izq": return { x: x - d, y };
    case "der": return { x: x + d, y };
    case "arriba": return { x, y: y - d };
    case "abajo": return { x, y: y + d };
  }
}
