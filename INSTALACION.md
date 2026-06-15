# Módulo: Requisitos legales y otros requisitos (ISO 14001/45001 6.1.3)

Frontend del módulo de requisitos legales. El backend ya está aplicado (migración 031).

## Archivos NUEVOS — copiar a estas rutas exactas del repo

| Archivo del zip | Ruta destino en el repo |
|---|---|
| `lib_schemas/requisito-legal.ts` | `lib/schemas/requisito-legal.ts` |
| `lib_api/requisitos-legales.ts` | `lib/api/requisitos-legales.ts` |
| `app_actions/actions.ts` | `app/(app)/requisitos-legales/actions.ts` |
| `components/GestionRequisitosLegales.tsx` | `components/requisitos-legales/GestionRequisitosLegales.tsx` |
| `pages/page.tsx` | `app/(app)/requisitos-legales/page.tsx` |

> Importante (GitHub web UI): para crear `app/(app)/requisitos-legales/page.tsx` y `actions.ts`,
> al subir el archivo escribí la ruta completa con `/` en el nombre y GitHub crea las carpetas solo.
> El grupo de ruta `(app)` ya existe, así que no hay carpetas dinámicas `[id]` que compliquen.

## DIFF — un solo archivo existente a editar: `components/layout/Sidebar.tsx`

### 1. Agregar el icono `Scale` al import de lucide-react

Buscá el bloque de import de iconos (arranca en `import {` y termina en `} from "lucide-react";`)
y agregá `Scale,` a la lista. Por ejemplo, después de `ShieldAlert,`:

```diff
   AlertOctagon,
   Grid3x3,
   ShieldAlert,
+  Scale,
   Gauge,
   Settings,
 } from "lucide-react";
```

### 2. Agregar el item al array `navItems`, en la sección `calidad`

Buscá la línea de "No conformidades" dentro de `navItems` y agregá la nueva línea
inmediatamente después (queda dentro de la sección "Calidad & Auditoría"):

```diff
   { href: "/ncs",           label: "No conformidades", icon: AlertOctagon, section: "calidad" },
+  { href: "/requisitos-legales", label: "Requisitos legales", icon: Scale, section: "calidad" },
```

Eso es todo. No hay más archivos existentes que tocar.

## Verificación post-deploy

1. Vercel buildea automáticamente tras el push.
2. Entrá a `/requisitos-legales` (o por el menú "Requisitos legales" en la sección Calidad & Auditoría).
3. Probá: crear un requisito (el código se autosugiere RL-001), vincularlo a uno o más procesos,
   y registrar una evaluación de cumplimiento desde el ícono de checklist.

## Notas de coherencia con el resto del sistema

- Usa el mismo patrón que el resto: `createClient` server-side, `obtenerUsuarioActualId`,
  Zod en `lib/schemas`, `useFormState`/`useFormStatus`, inline-dialogs, soft-delete con motivo.
- Resuelve nombres de norma/proceso/usuario en memoria (evita los joins frágiles de PostgREST,
  igual que `listarProcesosCatalogo` y `listarPoliticasRetencion`).
- Respeta el hardening: el RPC `fn_sugerir_codigo_requisito_legal` y las tablas no son accesibles
  por `anon`; la escritura está restringida por RLS a auditor/SGI (o autor en evaluaciones).
- El sidebar actual es estático. Si más adelante se conecta a `fn_perfil_menu_usuario()` para
  visibilidad por rol, este item debería sumarse a los que ven los Gestores.
