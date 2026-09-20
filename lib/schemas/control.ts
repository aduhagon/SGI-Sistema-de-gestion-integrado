import { z } from "zod";

const uuidOpcional = z.preprocess(
  (valor) => (valor === "" || valor == null ? undefined : valor),
  z.string().uuid().optional(),
);

export const periodicidadesControl = [
  "diaria",
  "semanal",
  "quincenal",
  "mensual",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
  "ad_hoc",
] as const;

export const controlSchema = z
  .object({
    id: uuidOpcional,
    codigo: z
      .string()
      .trim()
      .min(2, "El código debe tener al menos 2 caracteres.")
      .max(30, "El código no puede superar 30 caracteres.")
      .regex(/^[A-Z0-9][A-Z0-9_-]+$/, "Usá mayúsculas, números, guion o guion bajo."),
    procesoId: z.string().uuid("Elegí un proceso."),
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(200),
    descripcion: z.string().trim().max(4000).optional(),
    objetivo: z.string().trim().max(2000).optional(),
    tipo: z.enum(["preventivo", "detectivo", "correctivo"]),
    periodicidad: z.enum(periodicidadesControl),
    responsablePuestoId: uuidOpcional,
    instrucciones: z.string().trim().max(4000).optional(),
    requiereEvidencia: z.boolean(),
    anticipacionDias: z.coerce.number().int().min(0).max(90),
    proximaEjecucion: z.preprocess(
      (valor) => (valor === "" || valor == null ? undefined : valor),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
    estado: z.enum(["activo", "suspendido"]),
    riesgoIds: z.array(z.string().uuid()).max(100),
    requisitoIds: z.array(z.string().uuid()).max(200),
    documentoIds: z.array(z.string().uuid()).max(100),
    indicadorIds: z.array(z.string().uuid()).max(100),
  })
  .superRefine((valor, contexto) => {
    if (valor.periodicidad !== "ad_hoc" && !valor.proximaEjecucion) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proximaEjecucion"],
        message: "Indicá la próxima ejecución del control.",
      });
    }
    if (valor.riesgoIds.length === 0 && valor.requisitoIds.length === 0) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vinculos"],
        message: "Vinculá al menos un riesgo o requisito.",
      });
    }
  });

export const ejecucionControlSchema = z.object({
  controlId: z.string().uuid(),
  resultado: z.enum(["efectivo", "parcial", "inefectivo", "no_aplica"]),
  detalle: z.string().trim().max(4000).optional(),
  evidenciaDescripcion: z.string().trim().max(4000).optional(),
  fechaProgramada: z.preprocess(
    (valor) => (valor === "" || valor == null ? undefined : valor),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
});

export type ControlInput = z.infer<typeof controlSchema>;
