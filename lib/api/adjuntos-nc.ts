import { createClient } from "@/lib/supabase/server";

export type AdjuntoNC = {
  id: string;
  nombre: string;
  extension: string;
  tamanoBytes: number;
  mimeType: string;
  creadoEn: string;
};

/**
 * Lista los adjuntos de evidencia del PROBLEMA de una NC (contexto 'adjunto_nc').
 * No incluye la evidencia de eficacia (esa cuelga de las verificaciones).
 * La RLS garantiza que solo se devuelvan si la NC es visible para el usuario.
 */
export async function obtenerAdjuntosDeNC(ncId: string): Promise<AdjuntoNC[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("archivos")
    .select(`id, nombre_original, extension, "tamaño_bytes", mime_type, creado_en`)
    .eq("no_conformidad_id", ncId)
    .eq("contexto", "adjunto_nc")
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false });

  if (error) return [];

  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    nombre: a.nombre_original,
    extension: a.extension,
    tamanoBytes: a["tamaño_bytes"],
    mimeType: a.mime_type,
    creadoEn: a.creado_en,
  }));
}
