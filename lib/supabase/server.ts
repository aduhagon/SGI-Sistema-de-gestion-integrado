import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Las queries que pasen por este cliente respetan la sesión del usuario
 * (cookie) y aplican RLS en la base de datos.
 *
 * NO usar en Client Components. Para esos, usar createClient (client.ts).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // El método `setAll` falla en Server Components.
            // Es seguro ignorar esto si tenés el middleware refrescando
            // las sesiones de usuario.
          }
        },
      },
    },
  );
}
