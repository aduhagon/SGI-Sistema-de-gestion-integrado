import { createClient } from "@/lib/supabase/server";

/**
 * Mapa de calor de control por proceso.
 *
 * Cada proceso recibe un color global ('verde' | 'amarillo' | 'rojo' | 'gris')
 * que sale del peor estado entre 4 señales evaluables: NC abiertas, documentos /
 * revisiones, indicadores vs meta, y riesgos altos sin tratar.
 *
 * 'gris' = sin datos cargados todavía (no es alarma, es "pendiente de configurar").
 * Así un proceso vacío no se confunde con un proceso fuera de control.
 *
 * La lógica vive en la función SQL fn_mapa_calor_procesos() (verificada en la base).
 */

export type EstadoSenal = "verde" | "amarillo" | "rojo" | "gris";

export type ProcesoCalor = {
  procesoId: string;
  codigo: string;
  nombre: string;
  tipo: string;
  colorGlobal: EstadoSenal;
  nc: { estado: EstadoSenal; detalle: string };
  doc: { estado: EstadoSenal; detalle: string };
  ind: { estado: EstadoSenal; detalle: string };
  riesgo: { estado: EstadoSenal; detalle: string };
};

export async function obtenerMapaCalorProcesos(): Promise<ProcesoCalor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_mapa_calor_procesos");
  if (error || !data) return [];

  return (data as any[]).map((r) => ({
    procesoId: r.proceso_id,
    codigo: r.codigo,
    nombre: r.nombre,
    tipo: r.tipo,
    colorGlobal: r.color_global as EstadoSenal,
    nc: { estado: r.nc_estado as EstadoSenal, detalle: r.nc_detalle },
    doc: { estado: r.doc_estado as EstadoSenal, detalle: r.doc_detalle },
    ind: { estado: r.ind_estado as EstadoSenal, detalle: r.ind_detalle },
    riesgo: { estado: r.riesgo_estado as EstadoSenal, detalle: r.riesgo_detalle },
  }));
}
