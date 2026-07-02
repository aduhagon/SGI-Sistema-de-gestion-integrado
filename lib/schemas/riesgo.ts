import { z } from "zod";

export const riesgoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_-]{2,30}$/, "El código son 2 a 30 caracteres: mayúsculas, números, guion o guion bajo (ej: R-COM-01)."),
  procesoId: z.string().uuid({ message: "Elegí un proceso." }),
  categoria: z.enum(["riesgo", "oportunidad"]),
  titulo: z.string().trim().min(2, "El título es obligatorio.").max(300),
  descripcion: z.string().trim().max(3000).optional().or(z.literal("")),
  causa: z.string().trim().max(2000).optional().or(z.literal("")),
  consecuencia: z.string().trim().max(2000).optional().or(z.literal("")),
  probabilidad: z.coerce.number().int().min(1).max(5),
  impacto: z.coerce.number().int().min(1).max(5),
  tipoTratamiento: z.string().trim().optional().or(z.literal("")),
  tratamientoPlanificado: z.string().trim().max(3000).optional().or(z.literal("")),
  gradoControl: z
    .enum(["control_total", "control_parcial", "sin_control", "desestimado_gerencia"])
    .optional()
    .or(z.literal("")),
  justificacionControl: z.string().trim().max(2000, "La justificación no puede superar 2000 caracteres.").optional().or(z.literal("")),
  responsableId: z.string().uuid().optional().or(z.literal("")),
  fechaRevision: z.string().trim().optional().or(z.literal("")),
  estado: z.enum(["identificado", "en_tratamiento", "controlado", "materializado", "cerrado"]),
});

export type RiesgoInput = z.infer<typeof riesgoSchema>;
