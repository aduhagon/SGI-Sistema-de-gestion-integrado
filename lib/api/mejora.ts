import { createClient } from "@/lib/supabase/server";
import type { EstadoDocumental } from "@/components/ncs/CambioDocumental";

export async function obtenerCambiosDocumentales(ncId: string): Promise<EstadoDocumental[]> {
  const { data, error } = await createClient().rpc("fn_cambios_documentales_nc", { p_nc: ncId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type Referencia = { id: string; codigo: string; nombre: string };
export type ContextoControl = {
  control: Referencia;
  proceso: Referencia;
  riesgos: Referencia[];
  requisitos: Referencia[];
  documentos: Referencia[];
};
export type EjecucionMejora = {
  id: string;
  control_id: string;
  fecha_ejecucion: string;
  resultado: string;
  detalle: string | null;
  evidencia_descripcion: string | null;
  contexto: ContextoControl | null;
  nc: { id: string; codigo: string; estado: string } | null;
};

export async function obtenerEjecucionesControl(controlId: string, pagina = 0) {
  const supabase = createClient();
  const { data, error, count } = await supabase.from("control_ejecuciones")
    .select("id, control_id, fecha_ejecucion, resultado, detalle, evidencia_descripcion, contexto, nc:no_conformidades!no_conformidades_control_ejecucion_id_fkey(id,codigo,estado)", { count: "exact" })
    .eq("control_id", controlId).order("fecha_ejecucion", { ascending: false }).order("id")
    .range(pagina * 25, pagina * 25 + 24);
  if (error) throw new Error(`No se pudieron cargar las ejecuciones: ${error.message}`);
  return { ejecuciones: (data ?? []) as unknown as EjecucionMejora[], total: count ?? 0 };
}

export type EjecucionOpcion = { id: string; procesoId: string; label: string };
export async function obtenerEjecucionesAuditoria(auditoriaId: string): Promise<EjecucionOpcion[]> {
  const supabase = createClient();
  const { data: alcance, error: errorAlcance } = await supabase.from("auditoria_alcance").select("proceso_id")
    .eq("auditoria_id", auditoriaId).eq("activo", true).is("eliminado_en", null).not("proceso_id", "is", null);
  if (errorAlcance) throw new Error(errorAlcance.message);
  const procesos = (alcance ?? []).map((fila) => fila.proceso_id);
  if (!procesos.length) return [];
  const { data, error } = await supabase.from("control_ejecuciones")
    .select("id, fecha_ejecucion, resultado, contexto, control:controles!inner(proceso_id)")
    .in("control.proceso_id", procesos).order("fecha_ejecucion", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((fila: any) => ({
    id: fila.id,
    procesoId: fila.contexto?.proceso?.id ?? fila.control.proceso_id,
    label: `${fila.contexto?.control?.codigo ?? "Control"} · ${fila.fecha_ejecucion.slice(0, 10)} · ${fila.resultado}`,
  }));
}

export async function obtenerEstadoTratamiento(ncId: string): Promise<{
  puedeGestionar: boolean; puedeVerificar: boolean; bloqueoCierre: string | null;
}> {
  const { data, error } = await createClient().rpc("fn_estado_tratamiento_nc", { p_nc_id: ncId });
  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerVerificadoresMejora(): Promise<Array<{ id: string; nombre: string }>> {
  const { data, error } = await createClient().rpc("fn_verificadores_mejora");
  if (error) throw new Error(error.message);
  return data ?? [];
}
