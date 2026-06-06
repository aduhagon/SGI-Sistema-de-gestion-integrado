import { z } from "zod";

export const areaSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z.string().trim().min(1, "El código es obligatorio.").max(50),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcion: z.string().trim().max(2000).optional(),
});

export type AreaInput = z.infer<typeof areaSchema>;

export const sedeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z.string().trim().min(1, "El código es obligatorio.").max(50),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcion: z.string().trim().max(2000).optional(),
  localidad: z.string().trim().max(120).optional(),
  provincia: z.string().trim().max(120).optional(),
  pais: z.string().trim().max(120).optional(),
  tipoSede: z.string().trim().max(80).optional(),
  esSedePrincipal: z.boolean().default(false),
});

export type SedeInput = z.infer<typeof sedeSchema>;
