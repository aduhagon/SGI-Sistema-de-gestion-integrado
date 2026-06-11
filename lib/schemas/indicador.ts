import { z } from "zod";

const numOpcional = z
  .union([z.coerce.number(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));

export const indicadorSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_-]{2,30}$/, "El código son 2 a 30 caracteres: mayúsculas, números, guion o guion bajo (ej: KPI-PROD-01)."),
  procesoId: z.string().uuid({ message: "Elegí un proceso." }),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(300),
  descripcion: z.string().trim().max(2000).optional().or(z.literal("")),
  formula: z.string().trim().max(500).optional().or(z.literal("")),
  unidad: z.string().trim().max(40).optional().or(z.literal("")),
  meta: numOpcional,
  metaMinima: numOpcional,
  metaMaxima: numOpcional,
  sentido: z.enum(["mayor_mejor", "menor_mejor", "rango_optimo"]),
  periodicidad: z.enum(["diaria", "semanal", "quincenal", "mensual", "bimestral", "trimestral", "semestral", "anual", "ad_hoc"]),
  responsablePuestoId: z.string().uuid().optional().or(z.literal("")),
});

export type IndicadorInput = z.infer<typeof indicadorSchema>;

export const medicionSchema = z.object({
  indicadorId: z.string().uuid(),
  periodo: z.string().trim().min(1, "El período es obligatorio."),
  valor: z.coerce.number({ invalid_type_error: "El valor debe ser un número." }),
  comentario: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type MedicionInput = z.infer<typeof medicionSchema>;
