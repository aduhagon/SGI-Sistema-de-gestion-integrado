import { z } from "zod";

export const enviarAprobacionSchema = z
  .object({
    versionId: z.string().uuid("Versión inválida."),
    aprobadorN1Id: z.string().uuid("Elegí un aprobador de nivel 1."),
    aprobadorN2Id: z.string().uuid("Aprobador de nivel 2 inválido.").optional(),
    plazoDias: z.coerce
      .number()
      .int()
      .min(1, "El plazo debe ser de al menos 1 día.")
      .max(90, "El plazo no puede superar los 90 días.")
      .optional(),
    motivoOverride: z.string().trim().optional(),
  })
  .refine((d) => !d.aprobadorN2Id || d.aprobadorN1Id !== d.aprobadorN2Id, {
    message: "El aprobador de nivel 1 y el de nivel 2 deben ser personas distintas.",
    path: ["aprobadorN2Id"],
  });

export type EnviarAprobacionInput = z.infer<typeof enviarAprobacionSchema>;
