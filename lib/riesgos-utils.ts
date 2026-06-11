// Utilidades puras de riesgos (sin dependencias de servidor).
// Separadas para poder usarlas tanto en Server como en Client Components.

export type NivelRiesgo = "bajo" | "medio" | "alto" | "extremo";

// Clasificación del nivel a partir del producto probabilidad × impacto (1..25).
export function clasificarNivel(
  probabilidad: number,
  impacto: number,
): { numerico: number; nivel: NivelRiesgo } {
  const n = probabilidad * impacto;
  let nivel: NivelRiesgo;
  if (n <= 4) nivel = "bajo";
  else if (n <= 9) nivel = "medio";
  else if (n <= 15) nivel = "alto";
  else nivel = "extremo";
  return { numerico: n, nivel };
}
