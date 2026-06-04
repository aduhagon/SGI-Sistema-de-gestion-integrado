import { z } from "zod";

export const crearCoberturaSchema = z.object({
  documentoId: z.string().uuid("Documento inválido."),
  requisitoId: z.string().uuid("Elegí un requisito."),
  tipoCobertura: z.enum(["total", "parcial", "referencia"], {
    errorMap: () => ({ message: "Elegí el tipo de cobertura." }),
  }),
  seccionDocumento: z.string().trim().max(200).optional(),
  observaciones: z.string().trim().max(2000).optional(),
});

export type CrearCoberturaInput = z.infer<typeof crearCoberturaSchema>;
