import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper que se invoca desde middleware.ts en cada request.
 *
 * Cumple tres funciones:
 *   1. Refresca el JWT de Supabase si está por expirar
 *   2. Protege las rutas autenticadas (redirige a /login si no hay sesión)
 *   3. Redirige a /dashboard si un usuario logueado intenta acceder al login
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() también refresca el JWT si está por expirar
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginRoute = path.startsWith("/login");
  const isPublicRoute = isLoginRoute || path === "/" || path.startsWith("/auth/");

  // Si no hay sesión y la ruta requiere autenticación, redirigir a login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Si hay sesión y está en login, redirigir al dashboard
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
