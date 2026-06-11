// Utilidades puras de indicadores (sin dependencias de servidor).

export type CumplimientoEstado = "cumple" | "alerta" | "incumple" | "sin_meta";

// Evalúa si un valor cumple la meta según el sentido del indicador.
export function evaluarCumplimiento(
  valor: number,
  sentido: string,
  meta: number | null,
  metaMin: number | null,
  metaMax: number | null,
): CumplimientoEstado {
  if (sentido === "rango_optimo") {
    if (metaMin === null && metaMax === null) return "sin_meta";
    const dentro =
      (metaMin === null || valor >= metaMin) && (metaMax === null || valor <= metaMax);
    if (dentro) return "cumple";
    // Alerta si está cerca (10% del rango); si no, incumple.
    return "incumple";
  }

  if (meta === null) return "sin_meta";

  if (sentido === "mayor_mejor") {
    if (valor >= meta) return "cumple";
    if (valor >= meta * 0.9) return "alerta";
    return "incumple";
  }

  // menor_mejor
  if (valor <= meta) return "cumple";
  if (valor <= meta * 1.1) return "alerta";
  return "incumple";
}

export const SENTIDO_LABEL: Record<string, string> = {
  mayor_mejor: "Mayor es mejor",
  menor_mejor: "Menor es mejor",
  rango_optimo: "Rango óptimo",
};

export const PERIODICIDAD_LABEL: Record<string, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  ad_hoc: "Ad hoc",
};
