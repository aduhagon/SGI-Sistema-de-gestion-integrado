import { createClient } from "@/lib/supabase/server";

export type UsuarioElegible = {
  id: string;
  nombre: string;
};

/**
 * Usuarios que pueden ser elegidos como aprobadores.
 * Excluye al usuario indicado (típicamente el elaborador de la versión),
 * porque la segregación de funciones impide que el elaborador apruebe.
 */
export async function obtenerUsuariosElegibles(
  excluirUsuarioId?: string | null,
): Promise<UsuarioElegible[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select(`id, username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)`)
    .eq("activo", true);

  if (error) {
    throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
  }

  type Fila = {
    id: string;
    username: string;
    personas: { nombre: string; apellido: string } | null;
  };

  return ((data ?? []) as unknown as Fila[])
    .filter((u) => u.id !== excluirUsuarioId)
    .map((u) => ({
      id: u.id,
      nombre: u.personas
        ? `${u.personas.nombre} ${u.personas.apellido}`.trim()
        : u.username,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
