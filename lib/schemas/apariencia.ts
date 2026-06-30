import { z } from "zod";

/** HSL en formato shadcn: "H S% L%" — ej. "224 71% 31%". */
const hsl = z
  .string()
  .trim()
  .regex(
    /^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/,
    "Color HSL inválido (esperado: \"H S% L%\").",
  );

/** Radius CSS: número + unidad rem/px. */
const radius = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?(rem|px)$/, "Radio inválido (ej. 0.5rem u 8px).");

export const temaTokensSchema = z.object({
  background: hsl,
  foreground: hsl,
  card: hsl,
  cardForeground: hsl,
  muted: hsl,
  mutedForeground: hsl,
  primary: hsl,
  primaryForeground: hsl,
  accent: hsl,
  accentForeground: hsl,
  destructive: hsl,
  destructiveForeground: hsl,
  border: hsl,
  input: hsl,
  ring: hsl,
  sidebar: hsl,
  sidebarForeground: hsl,
  sidebarAccent: hsl,
  radius,
});

export type TemaTokensInput = z.infer<typeof temaTokensSchema>;

export const nombreTemaSchema = z
  .string()
  .trim()
  .min(1, "El nombre no puede estar vacío.")
  .max(60, "El nombre es demasiado largo.")
  .refine((n) => n.toLowerCase() !== "default", {
    message: 'El nombre "Default" está reservado para el tema de fábrica.',
  });
