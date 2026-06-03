import { z } from "zod";

export const firmarAcuseSchema = z.object({
  acuseId: z.string().uuid("Acuse inválido."),
  confirmaLectura: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, {
      message: "Debés confirmar que leíste el documento antes de firmar.",
    }),
});

export type FirmarAcuseInput = z.infer<typeof firmarAcuseSchema>;
