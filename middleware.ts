import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware de Next.js: se ejecuta antes de cada request.
 *
 * Función principal:
 *   - Refresca el JWT de Supabase si está por expirar
 *   - Protege rutas autenticadas (redirige a /login)
 *   - Redirige al dashboard si hay sesión activa y se intenta acceder a /login
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas EXCEPTO:
     *   - _next/static (archivos estáticos)
     *   - _next/image (optimización de imágenes)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - archivos con extensión (imágenes, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[a-zA-Z]+$).*)",
  ],
};
