import { z } from "zod";

export const crearReferenciaSchema = z.object({
  fragmentoId: z.string().uuid("Fragmento inválido."),
  requisitoId: z.string().uuid("Elegí un requisito."),
  tipo: z.enum(["cita_norma", "implementa", "remite"], {
    errorMap: () => ({ message: "Elegí el tipo de referencia." }),
  }),
  citaLiteral: z.string().trim().max(2000).optional(),
  observaciones: z.string().trim().max(2000).optional(),
});

export type CrearReferenciaInput = z.infer<typeof crearReferenciaSchema>;
