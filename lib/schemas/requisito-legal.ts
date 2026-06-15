import { z } from "zod";

// Valores del enum requisito_legal_tipo_enum (DB)
export const TIPOS_REQUISITO_LEGAL = [
  "ley",
  "decreto",
  "resolucion",
  "disposicion",
  "ordenanza",
  "norma_tecnica",
  "permiso_habilitacion",
  "contractual",
  "otro",
] as const;

// Valores del enum cumplimiento_estado_enum (DB)
export const ESTADOS_CUMPLIMIENTO = [
  "cumple",
  "cumple_parcial",
  "no_cumple",
  "no_aplica",
  "pendiente_evaluacion",
] as const;

// Valores del enum criticidad_enum (DB, reutilizado)
export const CRITICIDADES = ["critico", "alto", "medio", "bajo"] as const;

export const requisitoLegalSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z
    .string()
    .trim()
    .min(2, "El código es obligatorio.")
    .max(40, "El código es demasiado largo."),
  titulo: z
    .string()
    .trim()
    .min(3, "El título es obligatorio.")
    .max(300, "El título es demasiado largo."),
  descripcion: z.string().trim().max(4000).optional().or(z.literal("")),
  tipo: z.enum(TIPOS_REQUISITO_LEGAL),
  jurisdiccion: z.string().trim().max(120).optional().or(z.literal("")),
  organismoEmisor: z.string().trim().max(200).optional().or(z.literal("")),
  referencia: z.string().trim().max(200).optional().or(z.literal("")),
  fechaVigenciaDesde: z.string().trim().optional().or(z.literal("")),
  urlFuente: z
    .string()
    .trim()
    .url("La URL no es válida.")
    .max(500)
    .optional()
    .or(z.literal("")),
  normaId: z.string().uuid().optional().or(z.literal("")),
  criticidad: z.enum(CRITICIDADES).optional().or(z.literal("")),
  observaciones: z.string().trim().max(4000).optional().or(z.literal("")),
  // Procesos vinculados (IDs). Al menos uno recomendado, pero no obligatorio.
  procesosIds: z.array(z.string().uuid()).default([]),
});

export type RequisitoLegalInput = z.infer<typeof requisitoLegalSchema>;

export const evaluacionCumplimientoSchema = z.object({
  requisitoLegalId: z.string().uuid("Requisito inválido."),
  procesoId: z.string().uuid().optional().or(z.literal("")),
  estado: z.enum(ESTADOS_CUMPLIMIENTO),
  evidencia: z.string().trim().max(4000).optional().or(z.literal("")),
  fechaEvaluacion: z.string().trim().min(1, "La fecha de evaluación es obligatoria."),
  proximaEvaluacion: z.string().trim().optional().or(z.literal("")),
  observaciones: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type EvaluacionCumplimientoInput = z.infer<typeof evaluacionCumplimientoSchema>;

// Etiquetas legibles para la UI (voseo/es-AR)
export const ETIQUETA_TIPO: Record<(typeof TIPOS_REQUISITO_LEGAL)[number], string> = {
  ley: "Ley",
  decreto: "Decreto",
  resolucion: "Resolución",
  disposicion: "Disposición",
  ordenanza: "Ordenanza",
  norma_tecnica: "Norma técnica",
  permiso_habilitacion: "Permiso / Habilitación",
  contractual: "Contractual",
  otro: "Otro",
};

export const ETIQUETA_CUMPLIMIENTO: Record<
  (typeof ESTADOS_CUMPLIMIENTO)[number],
  string
> = {
  cumple: "Cumple",
  cumple_parcial: "Cumple parcialmente",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
  pendiente_evaluacion: "Pendiente de evaluación",
};
