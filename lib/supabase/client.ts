import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Client Components (browser).
 *
 * Usar SOLO en componentes marcados con "use client".
 * Para Server Components y Server Actions, usar createServerClient (server.ts).
 *
 * Las cookies de sesión las maneja automáticamente el SDK + el middleware.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
