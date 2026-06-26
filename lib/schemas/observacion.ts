import { z } from "zod";

// Estados válidos del seguimiento de un hallazgo (enum existente en la DB).
export const tratamientoObservacionSchema = z.object({
  id: z.string().uuid({ message: "Observación inválida." }),
  estado: z.enum(["abierto", "en_tratamiento", "cerrado", "aceptado_riesgo"]),
  responsableId: z.string().uuid().optional().or(z.literal("")),
  accionTratamiento: z.string().trim().max(3000).optional().or(z.literal("")),
  fechaLimite: z.string().trim().optional().or(z.literal("")),
  motivoCierre: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type TratamientoObservacionInput = z.infer<typeof tratamientoObservacionSchema>;
