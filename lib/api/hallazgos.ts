import { createClient } from "@/lib/supabase/server";

export type Hallazgo = {
  id: string;
  codigo: string;
  tipo: string;
  severidad: string | null;
  titulo: string;
  descripcion: string;
  evidencia: string | null;
  estado: string;
  requisitoClausula: string | null;
  procesoNombre: string | null;
  documentoCodigo: string | null;
  detectadoEn: string;
};

export async function obtenerHallazgosDeAuditoria(
  auditoriaId: string,
): Promise<Hallazgo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hallazgos")
    .select(
      `id, codigo, tipo, severidad, titulo, descripcion, evidencia, estado, detectado_en,
       requisitos:requisitos!hallazgos_requisito_id_fkey (clausula),
       procesos:procesos!hallazgos_proceso_id_fkey (nombre),
       documentos:documentos!hallazgos_documento_id_fkey (codigo)`,
    )
    .eq("auditoria_id", auditoriaId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("detectado_en", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los hallazgos: ${error.message}`);

  type Fila = {
    id: string;
    codigo: string;
    tipo: string;
    severidad: string | null;
    titulo: string;
    descripcion: string;
    evidencia: string | null;
    estado: string;
    detectado_en: string;
    requisitos: { clausula: string } | null;
    procesos: { nombre: string } | null;
    documentos: { codigo: string } | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((h) => ({
    id: h.id,
    codigo: h.codigo,
    tipo: h.tipo,
    severidad: h.severidad,
    titulo: h.titulo,
    descripcion: h.descripcion,
    evidencia: h.evidencia,
    estado: h.estado,
    requisitoClausula: h.requisitos?.clausula ?? null,
    procesoNombre: h.procesos?.nombre ?? null,
    documentoCodigo: h.documentos?.codigo ?? null,
    detectadoEn: h.detectado_en,
  }));
}

/**
 * Genera el código de hallazgo HAL-AAAA-NNN-SSS donde NNN viene del código
 * de la auditoría y SSS es secuencial dentro de la auditoría.
 */
export async function generarCodigoHallazgo(
  auditoriaId: string,
  codigoAuditoria: string,
): Promise<string> {
  const supabase = createClient();
  const anio = new Date().getFullYear();

  // NNN del código de auditoría (AUD-2026-001 -> 001)
  const partesAud = codigoAuditoria.split("-");
  const nnn = (partesAud[2] ?? "001").padStart(3, "0");

  const { count } = await supabase
    .from("hallazgos")
    .select("id", { count: "exact", head: true })
    .eq("auditoria_id", auditoriaId);

  const sss = String((count ?? 0) + 1).padStart(3, "0");
  return `HAL-${anio}-${nnn}-${sss}`;
}

/** Requisitos de las normas en alcance de la auditoría, para vincular. */
export async function obtenerRequisitosDeAuditoria(
  auditoriaId: string,
): Promise<Array<{ id: string; clausula: string; titulo: string; norma: string }>> {
  const supabase = createClient();

  // Versiones de norma en el alcance
  const { data: alcance } = await supabase
    .from("auditoria_alcance")
    .select("version_norma_id")
    .eq("auditoria_id", auditoriaId)
    .not("version_norma_id", "is", null);

  const versionIds = (alcance ?? [])
    .map((a) => a.version_norma_id as string)
    .filter(Boolean);

  if (versionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("requisitos")
    .select(
      `id, clausula, titulo,
       versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
         normas:normas!versiones_norma_norma_id_fkey (codigo)
       )`,
    )
    .in("version_norma_id", versionIds)
    .eq("activo", true);

  if (error) return [];

  type Fila = {
    id: string;
    clausula: string;
    titulo: string;
    versiones_norma: { normas: { codigo: string } | null } | null;
  };

  return ((data ?? []) as unknown as Fila[])
    .map((r) => ({
      id: r.id,
      clausula: r.clausula,
      titulo: r.titulo,
      norma: r.versiones_norma?.normas?.codigo ?? "",
    }))
    .sort((a, b) => {
      if (a.norma !== b.norma) return a.norma.localeCompare(b.norma);
      const pa = a.clausula.split(".").map(Number);
      const pb = b.clausula.split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
      }
      return 0;
    });
}

/** Procesos en alcance de la auditoría, para vincular. */
export async function obtenerProcesosDeAuditoria(
  auditoriaId: string,
): Promise<Array<{ id: string; codigo: string; nombre: string }>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("auditoria_alcance")
    .select(
      `procesos:procesos!auditoria_alcance_proceso_id_fkey (id, codigo, nombre)`,
    )
    .eq("auditoria_id", auditoriaId)
    .not("proceso_id", "is", null);

  type Fila = { procesos: { id: string; codigo: string; nombre: string } | null };
  return ((data ?? []) as unknown as Fila[])
    .map((a) => a.procesos)
    .filter((p): p is { id: string; codigo: string; nombre: string } => p !== null);
}
