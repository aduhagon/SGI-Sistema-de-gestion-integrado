# Fix — el link "¿Olvidaste tu contraseña?" redirige al login

## Qué pasaba

Al entrar a `/recuperar`, el sistema te devolvía al login
(`/login?redirect=/recuperar`). Causa: el **middleware de autenticación** trata
`/recuperar` y `/restablecer` como rutas privadas y exige sesión. Pero son
rutas que usa alguien que **no está logueado** (justamente olvidó su contraseña),
así que tienen que ser públicas.

En `lib/supabase/middleware.ts`, las rutas públicas eran solo:

```js
const isPublicRoute = isLoginRoute || path === "/" || path.startsWith("/auth/");
```

`/recuperar` y `/restablecer` no estaban → el middleware las bloqueaba.

## Solución

Reemplazá `lib/supabase/middleware.ts` por el archivo incluido. Es tu archivo
actual con `/recuperar` y `/restablecer` agregadas a las rutas públicas:

```js
const isPublicRoute =
  isLoginRoute ||
  path === "/" ||
  path.startsWith("/auth/") ||
  path.startsWith("/recuperar") ||
  path.startsWith("/restablecer");
```

Todo lo demás del middleware queda idéntico.

## Por qué afecta también a /restablecer

Sin este fix, aunque el mail de recuperación llegue, al tocar el enlace el
usuario sería pateado al login antes de poder definir la contraseña nueva. Así
que este fix es necesario para que el flujo completo funcione, no solo el link.

## Pasos

1. Reemplazá `lib/supabase/middleware.ts` por el del paquete.
2. Commit a `main`, build.
3. Probá: en el login, tocá "¿Olvidaste tu contraseña?" → ahora SÍ debe abrir la
   página `/recuperar` con el formulario.

## Recordatorio (del paquete anterior)

Para que el **mail** funcione, en Supabase → Authentication → URL Configuration,
`/restablecer` debe estar en Redirect URLs (o el comodín `/**`). Eso es aparte de
este fix del middleware: el middleware controla el acceso a las páginas; la
Redirect URL controla que el enlace del mail sea aceptado.

## Checklist

- [ ] Reemplazado `lib/supabase/middleware.ts`.
- [ ] Build verde.
- [ ] "¿Olvidaste tu contraseña?" abre `/recuperar` (ya no redirige al login).
- [ ] Entrar directo a `/recuperar` por la barra carga el formulario.
- [ ] (Para el mail) `/restablecer` permitido en Supabase Redirect URLs.
