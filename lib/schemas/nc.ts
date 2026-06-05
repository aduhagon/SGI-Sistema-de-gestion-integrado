import { z } from "zod";

export const ORIGENES_NC = [
  "auditoria_interna",
  "auditoria_externa",
  "reclamo_cliente",
  "control_interno",
  "proveedor",
  "accidente",
  "otro",
] as const;

const ORIGENES_AUDITORIA = ["auditoria_interna", "auditoria_externa"];

export const crearNCSchema = z
  .object({
    titulo: z.string().trim().min(3, "El título es obligatorio.").max(200),
    descripcion: z.string().trim().min(3, "La descripción es obligatoria.").max(4000),
    tipo: z.enum(["no_conformidad", "desviacion", "incidente"]).default("no_conformidad"),
    severidad: z.enum(["alta", "media", "baja"]).default("media"),
    origen: z.enum(ORIGENES_NC, {
      errorMap: () => ({ message: "Elegí el origen de la no conformidad." }),
    }),
    hallazgoId: z.string().uuid().optional().or(z.literal("")),
    origenDescripcion: z.string().trim().max(2000).optional(),
    procesoId: z.string().uuid().optional().or(z.literal("")),
    fechaLimiteCierre: z.string().optional().or(z.literal("")),
    requiereAccionInmediata: z.boolean().default(false),
    accionInmediataDescripcion: z.string().trim().max(2000).optional(),
  })
  .refine(
    (d) => !ORIGENES_AUDITORIA.includes(d.origen) || (d.hallazgoId && d.hallazgoId !== ""),
    {
      message: "Las NC de origen auditoría deben vincularse a un hallazgo.",
      path: ["hallazgoId"],
    },
  )
  .refine(
    (d) =>
      !d.requiereAccionInmediata ||
      (d.accionInmediataDescripcion !== undefined &&
        d.accionInmediataDescripcion.length > 0),
    {
      message: "Si requiere acción inmediata, describí cuál.",
      path: ["accionInmediataDescripcion"],
    },
  );

export type CrearNCInput = z.infer<typeof crearNCSchema>;

// Análisis de causa raíz (paso posterior a la apertura)
export const analisisCausaSchema = z.object({
  ncId: z.string().uuid(),
  metodoAnalisis: z.enum(["cinco_porques", "ishikawa", "pareto", "arbol_fallas", "otro"], {
    errorMap: () => ({ message: "Elegí el método de análisis." }),
  }),
  analisisCausaRaiz: z
    .string()
    .trim()
    .min(10, "El análisis de causa raíz debe tener al menos 10 caracteres.")
    .max(8000),
});

export type AnalisisCausaInput = z.infer<typeof analisisCausaSchema>;
