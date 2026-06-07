import { z } from "zod";

export const personaSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  apellido: z.string().trim().min(1, "El apellido es obligatorio.").max(200),
  email: z
    .string()
    .trim()
    .email("El email no tiene un formato válido.")
    .max(200)
    .optional()
    .or(z.literal("")),
  documentoIdentidad: z.string().trim().max(50).optional().or(z.literal("")),
  cargo: z.string().trim().max(200).optional().or(z.literal("")),
  telefono: z.string().trim().max(50).optional().or(z.literal("")),
  areaId: z.string().uuid().optional().or(z.literal("")),
  esExterna: z.boolean().default(false),
  organizacionExterna: z.string().trim().max(200).optional().or(z.literal("")),
});

export type PersonaInput = z.infer<typeof personaSchema>;
