import { z } from "zod";

export const editarMetadataSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(300, "El título no puede tener más de 300 caracteres"),
  descripcion_corta: z
    .string()
    .trim()
    .max(500, "La descripción no puede tener más de 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  criticidad: z.enum(["bajo", "medio", "alto", "critico"]),
  confidencialidad: z.enum(["publico", "interno", "confidencial", "restringido"]),
  idioma: z
    .string()
    .trim()
    .length(2, "El idioma debe ser un código de 2 letras (ej: es, en)")
    .regex(/^[a-z]{2}$/, "El idioma debe estar en minúsculas (ej: es)"),
  frecuencia_revision: z.enum([
    "sin_revision",
    "anual",
    "bienal",
    "trienal",
    "quinquenal",
  ]),
  requiere_acuse_lectura: z.coerce.boolean(),
  normas_ids: z.array(z.string().uuid()).default([]),
  motivo_edicion: z
    .string()
    .trim()
    .min(5, "Indicá brevemente por qué hacés esta edición de metadata")
    .max(500, "El motivo no puede tener más de 500 caracteres"),
});

export type EditarMetadataInput = z.infer<typeof editarMetadataSchema>;

export const nuevaVersionSchema = z.object({
  motivo_cambio: z
    .string()
    .trim()
    .min(10, "Describí en al menos 10 caracteres qué cambió en esta versión")
    .max(1000, "El motivo no puede tener más de 1000 caracteres"),
});

export type NuevaVersionInput = z.infer<typeof nuevaVersionSchema>;
