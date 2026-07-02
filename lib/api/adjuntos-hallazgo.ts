import { createClient } from "@/lib/supabase/server";

export type AdjuntoHallazgo = {
  id: string;
  hallazgoId: string;
  nombre: string;
  extension: string;
  tamanoBytes: number;
  mimeType: string;
  creadoEn: string;
};

/**
 * Adjuntos de documentación de los hallazgos indicados (contexto
 * 'adjunto_hallazgo'), agrupables por hallazgo en el cliente.
 * La RLS garantiza que solo se devuelvan los de hallazgos visibles.
 */
export async function obtenerAdjuntosDeHallazgos(
  hallazgoIds: string[],
): Promise<AdjuntoHallazgo[]> {
  if (hallazgoIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("archivos")
    .select(`id, hallazgo_id, nombre_original, extension, "tamaño_bytes", mime_type, creado_en`)
    .in("hallazgo_id", hallazgoIds)
    .eq("contexto", "adjunto_hallazgo")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false });

  if (error) return [];

  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    hallazgoId: a.hallazgo_id,
    nombre: a.nombre_original,
    extension: a.extension,
    tamanoBytes: a["tamaño_bytes"],
    mimeType: a.mime_type,
    creadoEn: a.creado_en,
  }));
}
