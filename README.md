# SGI Multinorma — MSU

Sistema de Gestión Documental Multinorma para empresa agroindustrial.
Soporta ISO 9001, ISO 14001, ISO 45001, BRCGS, GlobalGAP y BPA simultáneamente.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Tailwind CSS** + **shadcn/ui** (estilo personalizado)
- **IBM Plex** (Sans + Serif + Mono) como sistema tipográfico
- **Vercel** para hosting

---

## Cómo deployar este proyecto (paso a paso)

> ✋ **No necesitás Node.js local.** Todo se hace online: GitHub + Vercel + Supabase.

### Paso 1 — Subir el código a GitHub

1. Andá a [github.com/new](https://github.com/new) y creá un repo nuevo:
   - **Repository name**: `sgi-msu` (o el que prefieras)
   - **Privacy**: **Private** (es código interno de MSU)
   - **NO** marqués "Add a README" ni "Add a .gitignore" (este zip ya los trae).
   - Click **Create repository**.

2. Vas a ver una página con instrucciones. **Ignorá las de línea de comandos.** En su lugar, hacé scroll hasta encontrar el link **"uploading an existing file"** (o entrá a la página del repo y click en **"Add file" → "Upload files"**).

3. **Arrastrá TODO el contenido del zip extraído** (archivos y carpetas) al área de upload de GitHub. No el zip — los archivos descomprimidos.

4. En el comentario del commit poné: `Setup inicial del proyecto SGI`.

5. Click **Commit changes**. GitHub sube todo y queda en la rama `main`.

### Paso 2 — Conectar Vercel

1. Andá a [vercel.com/new](https://vercel.com/new).
2. Si nunca usaste Vercel: registrate con tu cuenta de GitHub (más simple).
3. **Import Git Repository** → buscá `sgi-msu` y click **Import**.
4. En la pantalla de configuración:
   - **Framework Preset**: Next.js (se detecta automáticamente).
   - **Build & Output Settings**: dejá los defaults.
   - **Environment Variables**: hacé click en **Add** y agregá las **dos variables** del paso 3 antes de hacer Deploy. ⚠️ Si lo hacés Deploy sin las variables, el build falla.

### Paso 3 — Configurar variables de entorno

Necesitás dos valores de Supabase:

1. Andá a [supabase.com/dashboard/project/hghzpuvxggvpgwzpzaqw/settings/api](https://supabase.com/dashboard/project/hghzpuvxggvpgwzpzaqw/settings/api)
2. Buscá la sección **Project API keys**.
3. Copiá los dos valores que necesitás:
   - **Project URL**: `https://hghzpuvxggvpgwzpzaqw.supabase.co`
   - **anon / public**: una cadena larga JWT (empieza con `eyJ...`)

En Vercel, agregá las dos variables:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hghzpuvxggvpgwzpzaqw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clave anon pública (la del paso anterior) |

Asegurate que **ambas estén marcadas para "Production", "Preview" y "Development"**.

### Paso 4 — Deploy

1. Click **Deploy**.
2. Esperá ~90 segundos. Vas a ver el logo de Vercel haciendo la animación.
3. Cuando termine, click en **Visit** o copiá la URL pública (algo como `sgi-msu-tunombre.vercel.app`).

### Paso 5 — Crear tu primer usuario

Como todavía no tenés SSO con Microsoft Entra ID, los usuarios se crean manualmente en Supabase:

1. Andá a [supabase.com/dashboard/project/hghzpuvxggvpgwzpzaqw/auth/users](https://supabase.com/dashboard/project/hghzpuvxggvpgwzpzaqw/auth/users)
2. Click **Add user** → **Create new user**.
3. Email + contraseña. Marcá **Auto Confirm User** para saltearte la verificación por email.
4. Click **Create user**.

Volvé a la URL de Vercel, ingresá con esas credenciales, y debería llevarte al dashboard. 🎉

---

## Lo que viene (próximas pantallas)

Este zip es la **Semana 1 de Fase 1B**. Las siguientes semanas van a agregar:

| Semana | Pantalla |
|---|---|
| 2 | Dashboard con datos reales (aprobaciones, acuses pendientes) |
| 3 | Mapa de procesos interactivo |
| 4 | Listado y detalle de documentos |
| 5 | Wizard de alta de documento |
| 6 | Edición y nueva versión |
| 7 | Bandeja de aprobaciones + acuses con firma |
| 8 | Piloto interno |

---

## Estructura del proyecto

```
sgi-msu/
├── app/
│   ├── (auth)/login/          → Pantalla de login
│   ├── (app)/                 → Rutas autenticadas
│   │   ├── layout.tsx         → Layout con sidebar + topbar
│   │   └── dashboard/         → Página principal
│   ├── globals.css            → Estilos globales y tema
│   ├── layout.tsx             → Root layout con tipografía
│   └── page.tsx               → Redirige a /dashboard
├── components/
│   ├── auth/LoginForm.tsx     → Form de login
│   ├── layout/
│   │   ├── Sidebar.tsx        → Navegación lateral
│   │   └── TopBar.tsx         → Topbar con search + user menu
│   └── ui/                    → Componentes base (button, input, card)
├── lib/
│   ├── supabase/              → Clientes (browser, server, middleware)
│   └── utils.ts               → Util cn() para combinar clases
└── middleware.ts              → Protección de rutas y refresh de JWT
```

---

## Generar tipos TypeScript desde Supabase

Cuando agregues columnas o tablas, regenerá los tipos:

```bash
npx supabase gen types typescript --project-id hghzpuvxggvpgwzpzaqw --schema public > lib/supabase/database.types.ts
```

O usá el script abreviado:

```bash
npm run types
```

---

## Credenciales y secretos

- **Nunca commitees `.env.local`** (ya está en .gitignore).
- Las credenciales viven solo en **Vercel → Project Settings → Environment Variables**.
- El `anon key` de Supabase es **público por diseño** (es seguro exponerlo en el frontend): RLS limita lo que cada usuario puede leer/escribir.
- El `service role key` de Supabase **NUNCA va en el frontend**. Solo en Edge Functions y backend.
