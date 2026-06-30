/**
 * Tema visual de fábrica del SGI ("Default").
 *
 * Vive en código a propósito: es la base inmutable sobre la que se construyen
 * los temas del usuario. No existe como fila en `temas_visuales`, así que no se
 * puede editar ni borrar ni por SQL directo. El puntero `tema_activo_id` en
 * `configuracion_sistema` vale `null` cuando el sistema usa este tema.
 *
 * IMPORTANTE: estos valores son EXACTAMENTE los del :root actual de
 * app/globals.css. Aplicar el Default no produce ningún cambio visual respecto
 * a lo que la app ya muestra hoy (azul corporativo + acento verde oliva).
 *
 * Los tokens son los mismos que ya consume toda la app vía Tailwind/shadcn
 * (bg-primary, text-accent, bg-background, etc.). Por eso cambiar el tema
 * repinta la app sin migrar componentes: ya referencian estas variables.
 *
 * Formato HSL "H S% L%" (sin la función hsl()), igual que shadcn: el valor se
 * envuelve con hsl(var(--token)) en tailwind.config.ts.
 *
 * La tipografía NO forma parte del tema: IBM Plex se carga con next/font en
 * build time (--font-plex-sans/serif/mono) y no puede cambiarse en runtime.
 * El logo tampoco: vive en configuracion_sistema.org_logo_url.
 */

export type TemaTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  radius: string; // ej. "0.5rem"
};

export const TEMA_DEFAULT: TemaTokens = {
  background: "60 9% 98%",
  foreground: "24 10% 10%",
  card: "0 0% 100%",
  cardForeground: "24 10% 10%",
  muted: "60 5% 96%",
  mutedForeground: "25 5% 45%",
  primary: "224 71% 31%",
  primaryForeground: "0 0% 100%",
  accent: "84 60% 32%",
  accentForeground: "0 0% 100%",
  destructive: "0 72% 51%",
  destructiveForeground: "0 0% 100%",
  border: "20 6% 90%",
  input: "20 6% 90%",
  ring: "224 71% 31%",
  sidebar: "219 61% 15%",
  sidebarForeground: "214 32% 91%",
  sidebarAccent: "215 100% 75%",
  radius: "0.5rem",
};

export const NOMBRE_DEFAULT = "Default";

/**
 * Definición de cada token para la UI del panel: nombre legible, rol, y si es
 * un color HSL (editable con color-picker) o un valor especial (radius).
 * El orden es el de presentación en el editor.
 */
export type TokenMeta = {
  key: keyof TemaTokens;
  nombre: string;
  uso: string;
  tipo: "color" | "radius";
  /** algunos tokens son el "foreground" (texto) de otro; se agrupan visualmente */
  grupo: string;
};

export const TOKENS_META: TokenMeta[] = [
  { key: "primary", nombre: "Primario", uso: "Barra superior, botones, foco", tipo: "color", grupo: "Marca" },
  { key: "primaryForeground", nombre: "Texto sobre primario", uso: "Texto en botones primarios", tipo: "color", grupo: "Marca" },
  { key: "accent", nombre: "Acento", uso: "Resaltados, estados activos", tipo: "color", grupo: "Marca" },
  { key: "accentForeground", nombre: "Texto sobre acento", uso: "Texto sobre acento", tipo: "color", grupo: "Marca" },
  { key: "background", nombre: "Fondo", uso: "Lienzo de la app", tipo: "color", grupo: "Superficies" },
  { key: "foreground", nombre: "Texto", uso: "Color de lectura principal", tipo: "color", grupo: "Superficies" },
  { key: "card", nombre: "Tarjeta", uso: "Fondo de tarjetas y paneles", tipo: "color", grupo: "Superficies" },
  { key: "cardForeground", nombre: "Texto en tarjeta", uso: "Texto dentro de tarjetas", tipo: "color", grupo: "Superficies" },
  { key: "muted", nombre: "Atenuado", uso: "Fondos suaves, deshabilitados", tipo: "color", grupo: "Superficies" },
  { key: "mutedForeground", nombre: "Texto atenuado", uso: "Subtítulos, ayudas", tipo: "color", grupo: "Superficies" },
  { key: "border", nombre: "Borde", uso: "Líneas y separadores", tipo: "color", grupo: "Detalles" },
  { key: "input", nombre: "Campo", uso: "Borde de inputs", tipo: "color", grupo: "Detalles" },
  { key: "ring", nombre: "Anillo de foco", uso: "Contorno al enfocar", tipo: "color", grupo: "Detalles" },
  { key: "destructive", nombre: "Destructivo", uso: "Eliminar, errores", tipo: "color", grupo: "Detalles" },
  { key: "destructiveForeground", nombre: "Texto destructivo", uso: "Texto sobre destructivo", tipo: "color", grupo: "Detalles" },
  { key: "sidebar", nombre: "Barra superior", uso: "Fondo de la barra y el menú lateral", tipo: "color", grupo: "Barra superior" },
  { key: "sidebarForeground", nombre: "Texto de la barra", uso: "Texto e íconos sobre la barra", tipo: "color", grupo: "Barra superior" },
  { key: "sidebarAccent", nombre: "Acento de la barra", uso: "Buscador, resaltados sobre la barra", tipo: "color", grupo: "Barra superior" },
  { key: "radius", nombre: "Redondeo", uso: "Bordes de tarjetas y botones", tipo: "radius", grupo: "Forma" },
];

/** Mapea los tokens a las variables CSS de shadcn (las que YA usa la app). */
export function tokensACssVars(t: TemaTokens): Record<string, string> {
  return {
    "--background": t.background,
    "--foreground": t.foreground,
    "--card": t.card,
    "--card-foreground": t.cardForeground,
    "--muted": t.muted,
    "--muted-foreground": t.mutedForeground,
    "--primary": t.primary,
    "--primary-foreground": t.primaryForeground,
    "--accent": t.accent,
    "--accent-foreground": t.accentForeground,
    "--destructive": t.destructive,
    "--destructive-foreground": t.destructiveForeground,
    "--border": t.border,
    "--input": t.input,
    "--ring": t.ring,
    "--sidebar": t.sidebar,
    "--sidebar-foreground": t.sidebarForeground,
    "--sidebar-accent": t.sidebarAccent,
    "--radius": t.radius,
  };
}

export function tokensACssString(t: TemaTokens): string {
  return Object.entries(tokensACssVars(t))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/* ===================== utilidades HSL <-> HEX ===================== */
// El panel edita con color-picker (hex), pero guardamos HSL "H S% L%" para
// que sea drop-in en las vars de shadcn. Estas funciones convierten ida y vuelta.

/** "224 71% 31%" -> "#16367f" (aprox). */
export function hslStrToHex(hsl: string): string {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** "#16367f" -> "224 71% 31%" (redondeado, formato shadcn). */
export function hexToHslStr(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      default: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
