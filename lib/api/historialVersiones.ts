import { createClient } from "@/lib/supabase/server";

/**
 * Historial de versiones de un documento, para administradores.
 *
 * Trae todas las versiones (no eliminadas) con su estado, número, fecha, motivo
 * y el archivo principal (si tiene), para poder abrirlo en el visor.
 *
 * Ordenadas de la más nueva a la más vieja.
 */

export type VersionHistorial = {
  id: string;
  numeroVersion: string;
  numeroOrden: number;
  estado: string;
  esVigente: boolean;
  motivoCambio: string | null;
  creadaEn: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  // Archivo principal de esta versión (para el visor), si existe.
  archivo: {
    id: string;
    mimeType: string;
    nombreOriginal: string;
  } | null;
};

export async function obtenerHistorialVersiones(
  documentoId: string,
): Promise<VersionHistorial[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("versiones")
    .select(
      `id, numero_version, numero_orden, estado, es_vigente, motivo_cambio,
       creado_en, fecha_vigencia_desde, fecha_vigencia_hasta,
       archivos (
         id, mime_type, nombre_original, tipo_archivo, orden, activo
       )`,
    )
    .eq("documento_id", documentoId)
    .is("eliminado_en", null)
    .order("numero_orden", { ascending: false });

  if (error || !data) return [];

  type Fila = {
    id: string;
    numero_version: string;
    numero_orden: number;
    estado: string;
    es_vigente: boolean;
    motivo_cambio: string | null;
    creado_en: string;
    fecha_vigencia_desde: string | null;
    fecha_vigencia_hasta: string | null;
    archivos: Array<{
      id: string;
      mime_type: string;
      nombre_original: string;
      tipo_archivo: string;
      orden: number;
      activo: boolean;
    }> | null;
  };

  return (data as unknown as Fila[]).map((v) => {
    // Archivo principal: tipo "principal" y activo, el de menor orden.
    const principal = (v.archivos ?? [])
      .filter((a) => a.activo && a.tipo_archivo === "principal")
      .sort((a, b) => a.orden - b.orden)[0];

    return {
      id: v.id,
      numeroVersion: v.numero_version,
      numeroOrden: v.numero_orden,
      estado: v.estado,
      esVigente: v.es_vigente,
      motivoCambio: v.motivo_cambio,
      creadaEn: v.creado_en,
      vigenciaDesde: v.fecha_vigencia_desde,
      vigenciaHasta: v.fecha_vigencia_hasta,
      archivo: principal
        ? {
            id: principal.id,
            mimeType: principal.mime_type,
            nombreOriginal: principal.nombre_original,
          }
        : null,
    };
  });
}
