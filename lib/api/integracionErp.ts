import { createClient } from "@/lib/supabase/server";

export type ResumenIntegracionProceso = {
  proceso_id: string;
  codigo: string;
  nombre: string;
  proceso_padre_id: string | null;
  total_formularios: number;
  en_erp: number;
  fuera_erp: number;
  sin_clasificar: number;
  grado_integracion_pct: number | null;
};

export type FormularioErp = {
  documento_id: string;
  codigo: string;
  titulo: string;
  criticidad: string | null;
  gestionado_en_erp: boolean | null;
  sistema_externo: string | null;
};

/** Resumen de integración ERP de un proceso (o su árbol, si rollup = true). */
export async function obtenerIntegracionProceso(
  procesoId: string,
  rollup = false,
): Promise<ResumenIntegracionProceso | null> {
  const supabase = createClient();
  const vista = rollup ? "v_integracion_erp_proceso_rollup" : "v_integracion_erp_proceso";
  const { data, error } = await supabase
    .from(vista)
    .select(
      "proceso_id, codigo, nombre, proceso_padre_id, total_formularios, en_erp, fuera_erp, sin_clasificar, grado_integracion_pct",
    )
    .eq("proceso_id", procesoId)
    .maybeSingle();

  if (error) {
    console.error("obtenerIntegracionProceso:", error.message);
    return null;
  }
  return (data as ResumenIntegracionProceso) ?? null;
}

/** Formularios (tipo FOR) vigentes asociados a un proceso, con su marca de origen. */
export async function listarFormulariosErpDeProceso(
  procesoId: string,
): Promise<FormularioErp[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("v_formulario_proceso")
    .select("documento_id, codigo, titulo, criticidad, gestionado_en_erp, sistema_externo")
    .eq("proceso_id", procesoId)
    .order("codigo");

  if (error) {
    console.error("listarFormulariosErpDeProceso:", error.message);
    return [];
  }
  return (data as FormularioErp[]) ?? [];
}
