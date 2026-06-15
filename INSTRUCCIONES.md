# Fondo decorativo — Panorama de cumplimiento

Agrega el fondo de curvas suaves (con detalles dorados) detrás de toda la página
`/cumplimiento/panorama`, optimizado para no perder rendimiento.

## Optimización aplicada

- Original `Fondo.png`: **42 KB** (1672×941, PNG).
- Entregado `fondo-panorama.webp`: **10 KB** (mismo tamaño, WebP calidad 72).
- **76% más liviano**, sin pérdida visible. Para un fondo decorativo, WebP es
  ideal: comprime muy bien degradados y curvas.

## Archivos del zip — subir (GitHub web UI)

| Archivo | Acción |
|---|---|
| `public/fondo-panorama.webp` | **NUEVO** — la imagen optimizada (va en `public/`) |
| `app/(app)/cumplimiento/panorama/page.tsx` | **REEMPLAZA** — envuelve la página con el fondo |

> `public/` se sirve desde la raíz del sitio. Subí el `.webp` dentro de `public/`
> y Next lo expone como `/fondo-panorama.webp` (así lo referencia la página). Si
> la carpeta `public/` no existe aún en tu repo, GitHub la crea al subir el
> archivo dentro de esa ruta.

## Cómo está hecho

- El fondo se aplica por **CSS** (`background-image`), no con `next/image`: para
  un fondo decorativo es más simple y no requiere configuración.
- Encima de la imagen hay un **velo blanco translúcido** (`bg-background/70`) que
  aclara el fondo para que las tarjetas y el texto se lean con buen contraste.
- El fondo cubre al menos toda la altura visible (`min-h-[calc(100vh-4rem)]`,
  descontando el TopBar), aunque haya pocas normas cargadas.
- La imagen es decorativa (`aria-hidden`), no afecta accesibilidad ni se
  selecciona/clickea (`pointer-events-none`).

## Verificación tras el deploy

1. Entrá a `/cumplimiento/panorama` → detrás de los KPIs y las tarjetas de normas
   se ve el fondo suave con los toques dorados.
2. El texto y las tarjetas deben leerse igual de bien que antes (el velo lo
   garantiza).
3. Si querés el fondo **más** o **menos** presente, es un solo número: en
   `panorama/page.tsx`, el `bg-background/70` del velo. Más alto (ej. `/80`) =
   fondo más tenue; más bajo (ej. `/60`) = fondo más visible.
