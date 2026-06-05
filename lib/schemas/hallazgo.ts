import { z } from "zod";

export const TIPOS_HALLAZGO = [
  "no_conformidad_mayor",
  "no_conformidad_menor",
  "observacion",
  "oportunidad_mejora",
  "fortaleza",
] as const;

const TIPOS_NC = ["no_conformidad_mayor", "no_conformidad_menor"];

export const crearHallazgoSchema = z
  .object({
    auditoriaId: z.string().uuid("Auditoría inválida."),
    tipo: z.enum(TIPOS_HALLAZGO, {
      errorMap: () => ({ message: "Elegí el tipo de hallazgo." }),
    }),
    titulo: z.string().trim().min(3, "El título es obligatorio.").max(200),
    descripcion: z.string().trim().min(3, "La descripción es obligatoria.").max(4000),
    evidencia: z.string().trim().max(4000).optional(),
    severidad: z.enum(["alta", "media", "baja"]).optional(),
    requisitoId: z.string().uuid().optional().or(z.literal("")),
    procesoId: z.string().uuid().optional().or(z.literal("")),
    documentoId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((d) => !TIPOS_NC.includes(d.tipo) || d.severidad !== undefined, {
    message: "Las no conformidades requieren un nivel de severidad.",
    path: ["severidad"],
  })
  .refine((d) => TIPOS_NC.includes(d.tipo) || d.severidad === undefined, {
    message: "La severidad solo aplica a no conformidades.",
    path: ["severidad"],
  });

export type CrearHallazgoInput = z.infer<typeof crearHallazgoSchema>;
