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

export const participacionSchema = z.object({
  procesoId: z.string().uuid("Proceso inválido."),
  usuarioId: z.string().uuid("Elegí un usuario."),
  rol: z.enum(
    ["responsable_proceso", "elaborador", "aprobador_n1", "aprobador_n2", "lector"],
    { errorMap: () => ({ message: "Elegí un rol." }) },
  ),
  motivoAsignacion: z.string().trim().max(500).optional(),
});

export type ParticipacionInput = z.infer<typeof participacionSchema>;

export const puestoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres.")
    .max(30, "El código no puede superar los 30 caracteres.")
    .regex(CODIGO_REGEX, mensajeCodigo),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcion: z.string().trim().max(2000).optional(),
  areaId: z.string().uuid().optional().or(z.literal("")),
});

export type PuestoInput = z.infer<typeof puestoSchema>;

const CODIGO_TIPO_DOC_REGEX = /^[A-Z]{2,5}$/;

export const tipoDocumentalSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .regex(
      CODIGO_TIPO_DOC_REGEX,
      "El código debe ser de 2 a 5 letras MAYÚSCULAS, sin números ni símbolos (ej: POL, MAN, PRO).",
    ),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(120),
  nombrePlural: z.string().trim().min(2, "El nombre en plural es obligatorio.").max(120),
  descripcion: z.string().trim().max(2000).optional().or(z.literal("")),
  requiereAprobacion: z.boolean().default(true),
  requiereAcuseLectura: z.boolean().default(false),
  frecuenciaRevisionDefault: z.string().trim().optional().or(z.literal("")),
  criticidadDefault: z.string().trim().optional().or(z.literal("")),
  confidencialidadDefault: z.string().trim().optional().or(z.literal("")),
  ordenVisualizacion: z.coerce.number().int().min(0).default(0),
  nivelJerarquico: z.coerce.number().int().min(1).max(4).optional().or(z.literal("")),
});

export type TipoDocumentalInput = z.infer<typeof tipoDocumentalSchema>;

export const procesoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres.")
    .max(20, "El código no puede superar los 20 caracteres.")
    .regex(CODIGO_REGEX, mensajeCodigo),
  codigoNumerico: z
    .string()
    .trim()
    .regex(/^[0-9]{2}$/, "El código numérico debe ser exactamente 2 dígitos (ej: 01, 14).")
    .optional()
    .or(z.literal("")),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  descripcionCorta: z.string().trim().max(500).optional().or(z.literal("")),
  tipo: z.enum(["estrategico", "operativo", "apoyo"], {
    errorMap: () => ({ message: "Elegí una banda válida." }),
  }),
  procesoPadreId: z.string().uuid().optional().or(z.literal("")),
  ordenVisualizacion: z.coerce.number().int().min(0).default(0),
});

export type ProcesoInput = z.infer<typeof procesoSchema>;

const CODIGO_NORMA_REGEX = /^[A-Z0-9]{3,20}$/;

export const normaSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  codigo: z
    .string()
    .trim()
    .regex(
      CODIGO_NORMA_REGEX,
      "El código son 3 a 20 caracteres en MAYÚSCULAS y números, sin guiones ni espacios (ej: ISO9001, BRCGS).",
    ),
  nombreCorto: z.string().trim().min(2, "El nombre corto es obligatorio.").max(120),
  nombreCompleto: z.string().trim().min(2, "El nombre completo es obligatorio.").max(300),
  descripcion: z.string().trim().max(2000).optional().or(z.literal("")),
  organismoEmisor: z.string().trim().max(200).optional().or(z.literal("")),
  sitioWeb: z
    .string()
    .trim()
    .regex(/^https?:\/\//, "El sitio web debe empezar con http:// o https://")
    .optional()
    .or(z.literal("")),
  ambito: z.string().trim().max(120).optional().or(z.literal("")),
  certificadaPorMsu: z.boolean().default(true),
  ordenVisualizacion: z.coerce.number().int().min(0).default(0),
});

export type NormaInput = z.infer<typeof normaSchema>;
