import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Zona horaria por defecto si la clave no existe en configuracion_sistema
// o si la lectura falla. MSU opera en Argentina.
export const ZONA_HORARIA_DEFECTO = "America/Argentina/Buenos_Aires";

/**
 * Lee la zona horaria del sistema desde configuracion_sistema (clave-valor).
 *
 * Envuelta en cache() de React: dentro de un mismo render/request, varias
 * llamadas comparten una sola consulta a la base. Si la clave no existe o
 * la consulta falla, devuelve el default (Argentina) para que el cálculo
 * de vencimientos nunca quede sin zona.
 */
export const obtenerZonaHoraria = cache(async (): Promise<string> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("configuracion_sistema")
      .select("valor")
      .eq("clave", "zona_horaria")
      .maybeSingle();

    if (error || !data) return ZONA_HORARIA_DEFECTO;

    // valor es jsonb; para un string queda como string plano al deserializar.
    const valor = (data as { valor: unknown }).valor;
    if (typeof valor === "string" && valor.length > 0) return valor;

    return ZONA_HORARIA_DEFECTO;
  } catch {
    return ZONA_HORARIA_DEFECTO;
  }
});
