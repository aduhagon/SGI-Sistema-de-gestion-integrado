import { createHash } from "node:crypto";

/**
 * Calcula el hash SHA256 de un buffer en hexadecimal.
 *
 * Usado para:
 *   - Garantizar integridad del archivo subido al SGI
 *   - Detección de duplicados (mismo hash = mismo contenido)
 *   - Trazabilidad criptográfica (Pilar 2 de Auditabilidad ISO)
 */
export function calcularSha256(buffer: Buffer): string {
  const hash = createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

/**
 * Extrae la extensión de un nombre de archivo (sin el punto).
 * Devuelve string vacío si no hay extensión.
 *
 * Ejemplos:
 *   "politica.pdf" -> "pdf"
 *   "MANUAL DE CALIDAD.docx" -> "docx"
 *   "archivo" -> ""
 */
export function obtenerExtension(nombreArchivo: string): string {
  const idx = nombreArchivo.lastIndexOf(".");
  if (idx === -1 || idx === nombreArchivo.length - 1) return "";
  return nombreArchivo.slice(idx + 1).toLowerCase();
}

/**
 * Genera una ruta única en Storage para un archivo de documento.
 * Formato: {documento_id}/{version_numero}/{timestamp}-{nombre_archivo}
 *
 * El timestamp evita colisiones si se sube el mismo archivo dos veces
 * en la misma versión.
 */
export function generarStoragePath(
  documentoId: string,
  versionNumero: string,
  nombreArchivo: string,
): string {
  const timestamp = Date.now();
  const nombreSeguro = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${documentoId}/v${versionNumero}/${timestamp}-${nombreSeguro}`;
}
