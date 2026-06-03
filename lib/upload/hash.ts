import { createHash } from "node:crypto";

export function calcularSha256(buffer: Buffer): string {
  const hash = createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

export function obtenerExtension(nombreArchivo: string): string {
  const idx = nombreArchivo.lastIndexOf(".");
  if (idx === -1 || idx === nombreArchivo.length - 1) return "";
  return nombreArchivo.slice(idx + 1).toLowerCase();
}

export function generarStoragePath(
  documentoId: string,
  versionNumero: string,
  nombreArchivo: string,
): string {
  const timestamp = Date.now();
  const nombreSeguro = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${documentoId}/v${versionNumero}/${timestamp}-${nombreSeguro}`;
}
