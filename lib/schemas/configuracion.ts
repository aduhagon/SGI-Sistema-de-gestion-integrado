import { z } from "zod";

const CODIGO_REGEX = /^[A-Z0-9_-]+$/;
const mensajeCodigo =
  "El código solo admite MAYÚSCULAS, números, guion (-) y guion bajo (_). Sin espacios, puntos ni acentos.";

export const areaSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres.")
    .max(20, "El código no puede superar los 20 caracteres.")
    .regex(CODIGO_REGEX, mensajeCodigo),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcion: z.string().trim().max(2000).optional(),
  gerenciaId: z.string().uuid().optional().or(z.literal("")),
});

export type AreaInput = z.infer<typeof areaSchema>;

export const sedeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres.")
    .max(30, "El código no puede superar los 30 caracteres.")
    .regex(CODIGO_REGEX, mensajeCodigo),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcion: z.string().trim().max(2000).optional(),
  localidad: z.string().trim().max(120).optional(),
  provincia: z.string().trim().max(120).optional(),
  pais: z.string().trim().max(120).optional(),
  tipoSede: z.string().trim().max(80).optional(),
  esSedePrincipal: z.boolean().default(false),
});

export type SedeInput = z.infer<typeof sedeSchema>;
