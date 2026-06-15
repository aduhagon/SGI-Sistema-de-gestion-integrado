import { createClient } from "@/lib/supabase/server";

/**
 * Vista de administrador del módulo de aprobaciones:
 *  - Monitoreo: todas las aprobaciones pendientes del sistema (de cualquier usuario).
 *  - Reasignación: cambiar el aprobador de un nivel.
 *
 * Lógica en las funciones SQL fn_aprobaciones_pendientes_admin() y
 * fn_reasignar_aprobador() (verificadas en la base).
 */

export type AprobacionAdmin = {
  aprobacionId: string;
  versionId: string;
  documentoId: string;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  tipoCodigo: string | null;
  procesoCodigo: string | null;
  procesoNombre: string | null;
  nivelPendiente: number;
  aprobadorId: string | null;
  aprobadorNombre: string | null;
  iniciadaEn: string;
  plazoObjetivo: string | null;
  vencida: boolean;
  diasEsperando: number;
};

export type UsuarioOpcion = { id: string; nombre: string };

export async function obtenerAprobacionesPendientesAdmin(): Promise<AprobacionAdmin[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_aprobaciones_pendientes_admin");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    aprobacionId: r.aprobacion_id,
    versionId: r.version_id,
    documentoId: r.documento_id,
    codigo: r.codigo,
    titulo: r.titulo,
    numeroVersion: r.numero_version,
    tipoCodigo: r.tipo_codigo,
    procesoCodigo: r.proceso_codigo,
    procesoNombre: r.proceso_nombre,
    nivelPendiente: r.nivel_pendiente,
    aprobadorId: r.aprobador_id,
    aprobadorNombre: r.aprobador_nombre,
    iniciadaEn: r.iniciada_en,
    plazoObjetivo: r.plazo_objetivo,
    vencida: r.vencida,
    diasEsperando: r.dias_esperando,
  }));
}

/** Usuarios activos, para el selector de reasignación. */
export async function obtenerUsuariosParaReasignar(): Promise<UsuarioOpcion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, personas:personas!usuarios_persona_id_fkey(nombre, apellido)")
    .eq("activo", true);
  if (error || !data) return [];
  return (data as any[])
    .map((u) => ({
      id: u.id,
      nombre: `${u.personas?.nombre ?? ""} ${u.personas?.apellido ?? ""}`.trim(),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
