// Utilidades puras de riesgos (sin dependencias de servidor).
// Separadas para poder usarlas tanto en Server como en Client Components.

export type NivelRiesgo = "bajo" | "medio" | "alto" | "extremo";

// Clasificación del nivel a partir de un valor numérico (1..25).
// Fuente única de verdad de los cortes: la usan el nivel inherente y el residual.
export function clasificarNumerico(n: number): NivelRiesgo {
  if (n <= 4) return "bajo";
  if (n <= 9) return "medio";
  if (n <= 15) return "alto";
  return "extremo";
}

// Clasificación del nivel a partir del producto probabilidad × impacto (1..25).
export function clasificarNivel(
  probabilidad: number,
  impacto: number,
): { numerico: number; nivel: NivelRiesgo } {
  const n = probabilidad * impacto;
  return { numerico: n, nivel: clasificarNumerico(n) };
}

// ── Grado de control ────────────────────────────────────────────────────────
// Modula el riesgo inherente hacia un riesgo residual. NULL = "sin evaluar":
// no es lo mismo que "controlado", así que el árbol lo pinta gris, no verde.
export type GradoControl =
  | "control_total"
  | "control_parcial"
  | "sin_control"
  | "desestimado_gerencia"
  | null;

// Factor de reducción del inherente por grado de control.
// "desestimado_gerencia" NO reduce (la gerencia aceptó el riesgo conscientemente);
// se distingue de "sin_control" con un badge propio en la UI, no con el número.
export function factorControl(grado: GradoControl): number {
  switch (grado) {
    case "control_total":
      return 0.25;
    case "control_parcial":
      return 0.5;
    case "sin_control":
      return 1.0;
    case "desestimado_gerencia":
      return 1.0;
    default:
      return 1.0; // sin evaluar
  }
}

// Riesgo residual = round(inherente × factor). Mismo redondeo que la función SQL.
export function residual(
  probabilidad: number,
  impacto: number,
  grado: GradoControl,
): { numerico: number; nivel: NivelRiesgo } {
  const n = Math.round(probabilidad * impacto * factorControl(grado));
  return { numerico: n, nivel: clasificarNumerico(n) };
}

export const GRADO_CONTROL_LABEL: Record<
  Exclude<GradoControl, null>,
  string
> = {
  control_total: "Control total",
  control_parcial: "Control parcial",
  sin_control: "Sin control",
  desestimado_gerencia: "Desestimado por gerencia",
};

export const GRADOS_CONTROL: Array<Exclude<GradoControl, null>> = [
  "control_total",
  "control_parcial",
  "sin_control",
  "desestimado_gerencia",
];

// Madurez del control: escala cualitativa de 6 niveles, independiente del
// grado_control (que alimenta el residual) y del ciclo de vida (estado).
export type MadurezControl =
  | "no_existe"
  | "no_escritas"
  | "parcial_procedimientos"
  | "parcial_monitoreos"
  | "total"
  | "no_requiere"
  | null;

export const MADUREZ_CONTROL_LABEL: Record<
  Exclude<MadurezControl, null>,
  string
> = {
  no_existe: "No existe metodología de control",
  no_escritas: "Existen metodologías no escritas",
  parcial_procedimientos: "Control parcial mediante procedimientos",
  parcial_monitoreos: "Control parcial mediante monitoreos",
  total: "Control total mediante procedimientos y monitoreos",
  no_requiere: "No requiere control",
};

export const MADUREZ_CONTROL: Array<Exclude<MadurezControl, null>> = [
  "no_existe",
  "no_escritas",
  "parcial_procedimientos",
  "parcial_monitoreos",
  "total",
  "no_requiere",
];
