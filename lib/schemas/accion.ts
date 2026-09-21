import { z } from "zod";

export const crearAccionSchema = z.object({
  noConformidadId: z.string().uuid(),
  titulo: z.string().trim().min(3, "El título es obligatorio.").max(200),
  descripcion: z.string().trim().min(3, "La descripción es obligatoria.").max(4000),
  tipo: z.enum(["inmediata", "correctiva", "preventiva", "mejora"], {
    errorMap: () => ({ message: "Elegí el tipo de acción." }),
  }),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  responsableId: z.string().uuid("Elegí un responsable."),
  fechaLimite: z.string().date("Indicá una fecha límite válida."),
});

export type CrearAccionInput = z.infer<typeof crearAccionSchema>;

export const verificacionEficaciaSchema = z.object({
  noConformidadId: z.string().uuid(),
  resultado: z.enum(["eficaz", "no_eficaz", "parcialmente_eficaz"], {
    errorMap: () => ({ message: "Elegí el resultado de la verificación." }),
  }),
  conclusion: z.string().trim().min(10, "La conclusión debe tener al menos 10 caracteres.").max(4000),
  evidenciaRevisada: z.string().trim().min(5, "Describí la evidencia revisada.").max(4000),
  accionesVerificadas: z.array(z.string().uuid()).min(1, "Seleccioná las acciones verificadas.").max(200),
});

export type VerificacionEficaciaInput = z.infer<typeof verificacionEficaciaSchema>;
