/**
 * Resolución de rangos de fecha del tablero de NC. Compartido entre el filtro
 * (client) y la página (server) para que el preset signifique lo mismo en ambos.
 *
 * Las fechas se manejan como 'YYYY-MM-DD' (date pura, sin huso horario), que es
 * lo que esperan las funciones SQL (p_desde / p_hasta sobre fecha_apertura).
 */

export type PresetRango = "30d" | "90d" | "anio" | "todo" | "custom";

export const PRESETS: Array<{ id: PresetRango; label: string }> = [
  { id: "30d", label: "Últimos 30 días" },
  { id: "90d", label: "Últimos 90 días" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo el histórico" },
];

function aISO(d: Date): string {
  // YYYY-MM-DD en horario local (evita corrimiento por UTC).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Dado un preset (y, para 'custom', las fechas explícitas), devuelve el rango
 * concreto { desde, hasta } en 'YYYY-MM-DD'. 'todo' devuelve null/null.
 */
export function resolverRango(
  preset: PresetRango,
  desdeCustom?: string | null,
  hastaCustom?: string | null,
): { desde: string | null; hasta: string | null } {
  const hoy = new Date();

  switch (preset) {
    case "30d": {
      const d = new Date(hoy);
      d.setDate(d.getDate() - 30);
      return { desde: aISO(d), hasta: aISO(hoy) };
    }
    case "90d": {
      const d = new Date(hoy);
      d.setDate(d.getDate() - 90);
      return { desde: aISO(d), hasta: aISO(hoy) };
    }
    case "anio": {
      const d = new Date(hoy.getFullYear(), 0, 1);
      return { desde: aISO(d), hasta: aISO(hoy) };
    }
    case "custom":
      return {
        desde: desdeCustom && desdeCustom !== "" ? desdeCustom : null,
        hasta: hastaCustom && hastaCustom !== "" ? hastaCustom : null,
      };
    case "todo":
    default:
      return { desde: null, hasta: null };
  }
}

/** Etiqueta legible del rango activo, para el encabezado del tablero. */
export function etiquetaRango(
  preset: PresetRango,
  desde: string | null,
  hasta: string | null,
): string {
  if (preset === "todo") return "Todo el histórico";
  const p = PRESETS.find((x) => x.id === preset);
  if (p && preset !== "custom") return p.label;
  if (desde && hasta) return `${fmt(desde)} – ${fmt(hasta)}`;
  if (desde) return `Desde ${fmt(desde)}`;
  if (hasta) return `Hasta ${fmt(hasta)}`;
  return "Todo el histórico";
}

function fmt(iso: string): string {
  // 'YYYY-MM-DD' → '5 jun 2026' sin corrimiento de huso.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
