import { z } from "zod";

export const TIPOS_AUDITORIA = [
  "interna",
  "externa",
  "certificacion",
  "vigilancia",
  "recertificacion",
] as const;

const TIPOS_EXTERNOS = ["externa", "certificacion", "vigilancia", "recertificacion"];

export const crearAuditoriaSchema = z
  .object({
    titulo: z.string().trim().min(3, "El título es obligatorio.").max(200),
    descripcion: z.string().trim().max(2000).optional(),
    tipo: z.enum(TIPOS_AUDITORIA, {
      errorMap: () => ({ message: "Elegí el tipo de auditoría." }),
    }),
    fechaPlanificada: z.string().min(1, "Indicá la fecha planificada."),
    entidadCertificadora: z.string().trim().max(200).optional(),
    objetivo: z.string().trim().max(2000).optional(),
    alcanceGeneral: z.string().trim().max(2000).optional(),
    criterios: z.string().trim().max(2000).optional(),
    // alcance: ids de versiones de norma y de procesos
    normasIds: z.array(z.string().uuid()).default([]),
    procesosIds: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (d) =>
      !TIPOS_EXTERNOS.includes(d.tipo) ||
      (d.entidadCertificadora !== undefined && d.entidadCertificadora.length > 0),
    {
      message:
        "Las auditorías externas, de certificación, vigilancia o recertificación requieren entidad certificadora.",
      path: ["entidadCertificadora"],
    },
  )
  .refine((d) => d.normasIds.length > 0 || d.procesosIds.length > 0, {
    message: "El alcance debe incluir al menos una norma o un proceso.",
    path: ["normasIds"],
  });

export type CrearAuditoriaInput = z.infer<typeof crearAuditoriaSchema>;
