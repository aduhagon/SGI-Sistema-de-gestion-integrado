import { z } from "zod";

export const decisionAprobacionSchema = z
  .object({
    aprobacionId: z.string().uuid("Aprobación inválida."),
    nivel: z.coerce.number().int().refine((n) => n === 1 || n === 2, {
      message: "El nivel debe ser 1 o 2.",
    }),
    decision: z.enum(["aprobado", "rechazado"], {
      errorMap: () => ({ message: "La decisión debe ser aprobar o rechazar." }),
    }),
    comentario: z.string().trim().max(2000, "El comentario es demasiado largo.").optional(),
  })
  .refine(
    (data) =>
      data.decision === "aprobado" ||
      (data.comentario !== undefined && data.comentario.length >= 3),
    {
      message: "El comentario es obligatorio cuando se rechaza un documento.",
      path: ["comentario"],
    },
  );

export type DecisionAprobacionInput = z.infer<typeof decisionAprobacionSchema>;
