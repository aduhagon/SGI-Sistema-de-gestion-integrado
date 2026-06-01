import { z } from "zod";

/**
 * Schema de validación para la creación de un documento.
 *
 * Mínimo requerido para crear un documento en estado "borrador":
 *   - código (único)
 *   - título
 *   - tipo documental
 *   - proceso principal
 *
 * Todo lo demás es opcional o usa defaults del tipo documental.
 */
export const crearDocumentoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(50, "El código no puede tener más de 50 caracteres")
    .regex(
      /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/,
      "El código debe contener solo letras mayúsculas, números y guiones medios",
    ),
  titulo: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(300, "El título no puede tener más de 300 caracteres"),
  descripcion_corta: z
    .string()
    .trim()
    .max(500, "La descripción no puede tener más de 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tipo_documental_id: z.string().uuid("Seleccioná un tipo documental"),
  proceso_principal_id: z.string().uuid("Seleccioná un proceso principal"),
  normas_ids: z.array(z.string().uuid()).default([]),
  motivo_creacion: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CrearDocumentoInput = z.infer<typeof crearDocumentoSchema>;

/**
 * Tipos MIME permitidos para archivos principales de documentos del SGI.
 */
export const TIPOS_MIME_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
] as const;

/**
 * Tamaño máximo permitido para archivos principales (50 MB).
 */
export const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

/**
 * Valida que un File cumpla las restricciones del SGI.
 * Devuelve un mensaje de error o null si está OK.
 */
export function validarArchivo(file: File): string | null {
  if (file.size > TAMANO_MAXIMO_ARCHIVO) {
    return `El archivo excede el tamaño máximo permitido (50 MB). Tu archivo: ${(
      file.size /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }
  if (!TIPOS_MIME_PERMITIDOS.includes(file.type as (typeof TIPOS_MIME_PERMITIDOS)[number])) {
    return `Tipo de archivo no permitido: ${file.type || "desconocido"}. Permitidos: PDF, Word, Excel, PowerPoint, imágenes JPG/PNG.`;
  }
  return null;
}
