// Lista curada de zonas horarias para el selector de configuración.
// No usamos la lista IANA completa (cientos de entradas): MSU opera en
// Argentina, y se incluyen las zonas de la región por si en el futuro
// hay sitios en países limítrofes.
//
// `id` es el identificador IANA real que consume Intl.DateTimeFormat.
// `label` es lo que ve el administrador.

export type ZonaHoraria = { id: string; label: string };

export const ZONAS_HORARIAS: ZonaHoraria[] = [
  // Argentina (todas son UTC-3 hoy, pero IANA las distingue por historia).
  { id: "America/Argentina/Buenos_Aires", label: "Argentina — Buenos Aires (UTC-3)" },
  { id: "America/Argentina/Cordoba", label: "Argentina — Córdoba (UTC-3)" },
  { id: "America/Argentina/Mendoza", label: "Argentina — Mendoza (UTC-3)" },
  { id: "America/Argentina/Salta", label: "Argentina — Salta (UTC-3)" },
  { id: "America/Argentina/Tucuman", label: "Argentina — Tucumán (UTC-3)" },
  { id: "America/Argentina/Ushuaia", label: "Argentina — Ushuaia (UTC-3)" },
  // Región.
  { id: "America/Montevideo", label: "Uruguay — Montevideo (UTC-3)" },
  { id: "America/Sao_Paulo", label: "Brasil — São Paulo (UTC-3)" },
  { id: "America/Asuncion", label: "Paraguay — Asunción (UTC-3/-4)" },
  { id: "America/Santiago", label: "Chile — Santiago (UTC-3/-4)" },
  { id: "America/La_Paz", label: "Bolivia — La Paz (UTC-4)" },
];
