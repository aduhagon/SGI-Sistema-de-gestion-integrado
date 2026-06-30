# Paquete 044 — Temas visuales del SGI (versión unificada sobre shadcn)

Panel para parametrizar la identidad visual del SGI. **Unificado sobre el sistema
de design tokens que la app ya tiene** (shadcn/ui + Tailwind con CSS vars en HSL).
No introduce un sistema de tokens paralelo: el tema controla `--primary`,
`--accent`, `--background`, etc. — las mismas variables que ya consume toda la app.

## Qué cambió respecto a la primera versión

La primera versión inventaba un set de vars nuevo (`--c-principal`, etc.) en hex y
asumía identidad MSU Agro (verde + Montserrat). Al relevar el repo encontramos que:

- La app YA usa design tokens shadcn (`--primary`, `--accent`…) en formato HSL,
  consumidos por Tailwind (`bg-primary`, `text-accent`, `bg-background`).
- La identidad actual es **azul + IBM Plex**, no el verde MSU Agro del manual.

Decisiones tomadas (por Ale):
1. **Default = el azul + IBM Plex actual**. El tema de fábrica replica EXACTAMENTE
   el `:root` de `app/globals.css` hoy. Instalar esto no cambia nada visualmente.
2. **Unificar sobre los tokens shadcn**. El tema escribe los `--primary`, `--accent`,
   etc. existentes. Ventaja enorme: todo lo que ya usa `bg-primary`/`text-accent`/
   `bg-background` se repinta solo, sin migrar componentes.

## Estado de la base de datos

La migración **044_temas_visuales** ya está aplicada en producción (validada con
BEGIN/ROLLBACK). No hay SQL para correr. Sin cambios respecto a la primera versión:
tabla `temas_visuales` + RLS admin + puntero `tema_activo_id` en `configuracion_sistema`.

## Archivos (este zip)

| Ruta | Qué es |
|------|--------|
| `lib/tema/default.ts` | TEMA_DEFAULT = valores HSL exactos de globals.css. Metadatos de tokens para el panel. Conversores HSL↔hex (el picker usa hex, guardamos HSL). |
| `lib/schemas/apariencia.ts` | Validación Zod: HSL "H S% L%", radius rem/px, nombre. |
| `lib/api/temas.ts` | Listar temas, resolver activo (cae a Default si null/borrado). |
| `app/(app)/configuracion/apariencia/actions.ts` | Server actions (crear/actualizar/duplicar/renombrar/eliminar/aplicar). |
| `app/(app)/configuracion/apariencia/page.tsx` | Server Component de la ruta. |
| `components/configuracion/GestionApariencia.tsx` | Panel: tokens agrupados (Marca/Superficies/Detalles/Forma), preview con clases shadcn REALES. |
| `components/tema/TemaProvider.tsx` | Inyecta las vars del tema activo en el layout. |

## Integración manual (en archivos que YA existen)

### 1) Montar el TemaProvider en `app/(app)/layout.tsx`

Importar y renderizar lo más arriba posible del árbol del grupo (app):

```tsx
import TemaProvider from "@/components/tema/TemaProvider";
// dentro del JSX, antes del resto:
<TemaProvider />
```

Pisa el `:root` de globals.css con el tema activo. Como globals.css ya define los
mismos tokens como fallback, si el provider no corriera, la app sigue con el Default.
NO hay que tocar globals.css: ya tiene todos los tokens correctos.

### 2) Enlace en el índice de Configuración

En `app/(app)/configuracion/page.tsx`, sumar una tarjeta a `/configuracion/apariencia`
siguiendo el patrón de las demás secciones.

## Lo que el tema controla y lo que NO

**Controla** (cambia en vivo, sin rebuild):
- Los 15 colores semánticos shadcn: primary, accent, background, foreground, card,
  muted, border, input, ring, destructive y sus foregrounds.
- El radius global.

**NO controla** (a propósito):
- **Tipografía**: IBM Plex se carga con `next/font` en build time. No se puede
  cambiar de familia en runtime sin recargar otra fuente. Queda fuera del scope.
- **Colores de datos**: semáforos de riesgo (rojo/ámbar/verde), mapas de calor,
  árboles de cumplimiento. Son código de información, no identidad. Si el tema fuera
  azul, un riesgo "extremo" DEBE seguir siendo rojo. Estos viven hardcodeados en sus
  componentes (`ArbolCumplimiento`, `MapaCalorRiesgos`, etc.) y así deben quedar.
- **El logo**: sigue en `configuracion_sistema.org_logo_url`.

## Relevamiento de hardcodeo (referencia)

Del repo actual: ~240 hex literales + ~379 clases Tailwind de color fijo. Clasificados:
- **~70% son colores de datos/estado** (emerald/amber/rose de badges y mapas de calor).
  NO se tocan: son semánticos de información.
- **El chrome de marca** ya usa tokens shadcn salvo `components/layout/TopBar.tsx`,
  que tiene el azul `#0f1f3d` hardcodeado en ~8 lugares. **Candidato a migrar a
  `bg-primary`** para que la barra superior responda al tema. (No incluido en este
  paquete; es un cambio en archivo tuyo — ver nota abajo.)

### Sugerencia opcional: migrar TopBar al token primary

`components/layout/TopBar.tsx` usa `bg-[#0f1f3d]` y `text-[#0f1f3d]`. Si querés que la
barra superior siga el tema, reemplazar esos literales por `bg-primary` /
`text-primary` / `text-primary-foreground`. Es el único punto del chrome que hoy no
responde a los tokens. Lo dejo como sugerencia para que lo valides; puedo prepararte
el TopBar.tsx completo si querés.

## Validación hecha

- Migración: BEGIN/ROLLBACK + verificación post-aplicación.
- `tsc --noEmit`: pasa limpio sobre todos los archivos nuevos.
- Round-trip HSL↔hex testeado con los valores reales del default: estable, sin deriva.
