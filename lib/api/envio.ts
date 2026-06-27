import { createClient } from "@/lib/supabase/server";

export type NivelJerarquico = "gerente" | "jefatura" | "analista" | "operativo";

export type UsuarioElegible = {
  id: string;
  nombre: string;
  nivel: NivelJerarquico | null;
};

/**
 * Usuarios que pueden ser elegidos como aprobadores, con su nivel jerárquico
 * (el más alto entre sus puestos). Excluye al usuario indicado (el elaborador),
 * porque la segregación de funciones impide que el elaborador apruebe.
 */
export async function obtenerUsuariosElegibles(
  excluirUsuarioId?: string | null,
): Promise<UsuarioElegible[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("fn_usuarios_elegibles_con_nivel");
  if (error) {
    throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
  }

  type Fila = { usuario_id: string; nombre: string; nivel_jerarquico: NivelJerarquico | null };

  return ((data ?? []) as Fila[])
    .filter((u) => u.usuario_id !== excluirUsuarioId)
    .map((u) => ({ id: u.usuario_id, nombre: u.nombre, nivel: u.nivel_jerarquico }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export type SugerenciaAprobacion = {
  tipoCodigo: string;
  tipoNombre: string;
  nivelRevisor: NivelJerarquico | null;
  nivelN1: NivelJerarquico | null;
  nivelN2: NivelJerarquico | null;
  requiereN2: boolean;
} | null;

/**
 * Niveles sugeridos de aprobación para un documento, según su tipo
 * (matriz reglas_aprobacion_tipo). Sugerida, no bloqueante.
 */
export async function obtenerSugerenciaAprobacion(
  documentoId: string,
): Promise<SugerenciaAprobacion> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sugerencia_aprobacion", {
    p_documento_id: documentoId,
  });
  if (error || !data || (data as unknown[]).length === 0) return null;

  const r = (data as Array<{
    tipo_codigo: string; tipo_nombre: string;
    nivel_revisor: NivelJerarquico | null; nivel_n1: NivelJerarquico | null;
    nivel_n2: NivelJerarquico | null; requiere_n2: boolean;
  }>)[0];

  return {
    tipoCodigo: r.tipo_codigo,
    tipoNombre: r.tipo_nombre,
    nivelRevisor: r.nivel_revisor,
    nivelN1: r.nivel_n1,
    nivelN2: r.nivel_n2,
    requiereN2: r.requiere_n2,
  };
}
