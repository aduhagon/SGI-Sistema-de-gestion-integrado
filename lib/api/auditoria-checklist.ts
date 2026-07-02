import { createClient } from "@/lib/supabase/server";

export type ItemChecklist = {
  id: string;
  orden: number;
  descripcion: string;
  requisitoId: string | null;
  requisitoClausula: string | null;
  requisitoNorma: string | null;
  resultado: string; // pendiente | conforme | no_conforme | no_aplica
  comentario: string | null;
  hallazgoId: string | null;
  completadoEn: string | null;
};

/** Ítems activos del checklist de trabajo de la auditoría, en orden. */
export async function obtenerChecklistDeAuditoria(
  auditoriaId: string,
): Promise<ItemChecklist[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auditoria_checklist_items")
    .select(
      `id, orden, descripcion, requisito_id, resultado, comentario, hallazgo_id, completado_en,
       requisito:requisitos!auditoria_checklist_items_requisito_id_fkey (
         clausula,
         versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
           normas:normas!versiones_norma_norma_id_fkey (codigo)
         )
       )`,
    )
    .eq("auditoria_id", auditoriaId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });

  if (error) throw new Error(`No se pudo cargar el checklist: ${error.message}`);

  type Fila = {
    id: string;
    orden: number;
    descripcion: string;
    requisito_id: string | null;
    resultado: string;
    comentario: string | null;
    hallazgo_id: string | null;
    completado_en: string | null;
    requisito: {
      clausula: string;
      versiones_norma: { normas: { codigo: string } | null } | null;
    } | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((i) => ({
    id: i.id,
    orden: i.orden,
    descripcion: i.descripcion,
    requisitoId: i.requisito_id,
    requisitoClausula: i.requisito?.clausula ?? null,
    requisitoNorma: i.requisito?.versiones_norma?.normas?.codigo ?? null,
    resultado: i.resultado,
    comentario: i.comentario,
    hallazgoId: i.hallazgo_id,
    completadoEn: i.completado_en,
  }));
}
