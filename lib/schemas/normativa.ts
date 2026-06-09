import { z } from "zod";

export const versionNormaSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  normaId: z.string().uuid(),
  version: z.string().trim().min(1, "La versión es obligatoria.").max(60),
  nombreVersion: z.string().trim().max(200).optional().or(z.literal("")),
  fechaPublicacion: z.string().trim().optional().or(z.literal("")),
  fechaVigenciaDesde: z.string().trim().optional().or(z.literal("")),
  esVersionActual: z.boolean().default(false),
  urlDescarga: z
    .string()
    .trim()
    .regex(/^https?:\/\//, "El enlace debe empezar con http:// o https://")
    .optional()
    .or(z.literal("")),
});

export type VersionNormaInput = z.infer<typeof versionNormaSchema>;

export const requisitoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  versionNormaId: z.string().uuid(),
  clausula: z.string().trim().min(1, "La cláusula es obligatoria.").max(40),
  titulo: z.string().trim().min(2, "El título es obligatorio.").max(500),
  descripcion: z.string().trim().max(5000).optional().or(z.literal("")),
  esObligatorio: z.boolean().default(true),
  esCritico: z.boolean().default(false),
});

export type RequisitoInput = z.infer<typeof requisitoSchema>;
