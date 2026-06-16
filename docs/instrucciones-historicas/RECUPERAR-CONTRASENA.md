# Recuperación de contraseña

Agrega el flujo "¿Olvidaste tu contraseña?" para login con email/password de
Supabase. Tres piezas: link en el login, página para pedir el reset, y página
para definir la contraseña nueva al volver del mail.

## ⚠️ PASO CRÍTICO en Supabase (sin esto, NO funciona)

El flujo usa un enlace que vuelve a `https://<tu-dominio>/restablecer`. Esa URL
**debe estar permitida** en Supabase, igual que tuviste que hacer con la
invitación de usuarios. Si no, el mail llega pero el enlace falla.

En el panel de Supabase → **Authentication → URL Configuration**:

1. **Site URL**: confirmá que sea `https://sig-gestordocumental.vercel.app`
   (sin barra final).
2. **Redirect URLs**: agregá (si no está ya con el `/**`):
   ```
   https://sig-gestordocumental.vercel.app/restablecer
   ```
   Si ya tenés `https://sig-gestordocumental.vercel.app/**`, ese comodín ya cubre
   `/restablecer`, así que no hace falta agregar nada.

3. **Plantilla del mail** (opcional pero recomendado): en
   **Authentication → Email Templates → Reset Password**, verificá que el enlace
   use `{{ .ConfirmationURL }}`. Es el default, así que normalmente está bien.

> El SMTP de Gmail que ya configuraste para las invitaciones se reutiliza para
> este mail. No hay que tocar nada del SMTP.

## Archivos

**Nuevos (subir):**
1. `components/auth/RecuperarForm.tsx` — pide el email, envía el enlace.
2. `components/auth/RestablecerForm.tsx` — define la contraseña nueva.
3. `app/(auth)/recuperar/page.tsx` — página de recuperación.
4. `app/(auth)/restablecer/page.tsx` — página de nueva contraseña.

**Reemplazar:**
5. `components/auth/LoginForm.tsx` — tu login actual + el link "¿Olvidaste tu
   contraseña?" debajo del campo de contraseña. Todo lo demás idéntico.

## Cómo funciona el flujo

1. En el login, el usuario toca **"¿Olvidaste tu contraseña?"** → va a `/recuperar`.
2. Ingresa su email → se envía el mail con el enlace (vía Supabase +
   tu SMTP de Gmail). Por seguridad, siempre muestra "revisá tu correo", exista
   o no el email (no revela qué emails están registrados).
3. El usuario abre el mail y toca el enlace → llega a `/restablecer` con una
   sesión temporal de recuperación.
4. Define la contraseña nueva (mínimo 8 caracteres, con confirmación) → se
   guarda y lo redirige al login.

### Casos cubiertos

- **Enlace vencido o ya usado**: `/restablecer` detecta que no hay sesión de
  recuperación y muestra un aviso con link para pedir uno nuevo.
- **Entrar directo a /restablecer sin enlace**: mismo aviso (no hay sesión).
- **Contraseñas que no coinciden / muy cortas**: validación en el form.

## Verificado

- Tu login usa `signInWithPassword` con `@/lib/supabase/client` — los forms
  nuevos usan el mismo cliente y patrón.
- Los tres forms pasan chequeo de tipos.
- El layout de las páginas nuevas replica el de tu `/login` (aside con branding +
  form), así que se ven consistentes.

## Cómo probarlo

1. Hacé el paso de Supabase (URL Configuration) primero.
2. Subí los 5 archivos, build.
3. En el login, tocá "¿Olvidaste tu contraseña?".
4. Ingresá tu email → revisá que llegue el mail.
5. Tocá el enlace del mail → definí una contraseña nueva → ingresá con ella.

> Si el mail no llega: revisá spam, y confirmá que el SMTP de Gmail sigue activo
> en Supabase (Authentication → Settings → SMTP). Si el enlace da error al
> abrirlo: casi seguro es la Redirect URL del paso crítico.

## Checklist

- [ ] Supabase: `/restablecer` permitido en Redirect URLs (o el comodín `/**`).
- [ ] Subidos los 4 archivos nuevos.
- [ ] Reemplazado `LoginForm.tsx`.
- [ ] Build verde.
- [ ] En el login aparece "¿Olvidaste tu contraseña?".
- [ ] El mail llega y el enlace lleva a `/restablecer`.
- [ ] Cambiar la contraseña funciona y se puede ingresar con la nueva.
