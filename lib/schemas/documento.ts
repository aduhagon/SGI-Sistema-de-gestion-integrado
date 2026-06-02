import { z } from "zod";

/**
 * Schema de validación para la creación de un documento.
 *
 * Soporta tanto documentos padre (sin documento_padre_id) como hijos.
 * El código sigue la convención MSU: PAIS-TIPO-PROCESO-NUMERO[-HIJO].
 */
export const crearDocumentoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(7, "El código debe tener al menos 7 caracteres")
    .max(50, "El código no puede tener más de 50 caracteres")
    .regex(
      /^[A-Z]{1,3}-[A-Z]{2,3}-[0-9]{2}-[0-9]{3}(-[0-9]{3})?$/,
      "Formato esperado: PAIS-TIPO-PROCESO-NUMERO o PAIS-TIPO-PROCESO-PADRE-HIJO. Ej: A-MP-05-001 o A-FOR-05-001-001",
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
  pais_codigo: z.string().min(1).max(3).default("A"),
  documento_padre_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  normas_ids: z.array(z.string().uuid()).default([]),
  motivo_creacion: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CrearDocumentoInput = z.infer<typeof crearDocumentoSchema>;

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

export const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

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
