# Fix — el fondo no se veía (velo demasiado fuerte)

## Qué pasaba

El `.webp` carga bien (lo confirmaste abriéndolo directo). El problema era el
**velo de legibilidad**: estaba en `bg-background/70`, y como tu `--background` es
un crema casi blanco (`60 9% 98%`), un velo de ese color al 70% sobre una imagen
ya clara la borraba por completo → se veía un crema plano.

## La corrección

Bajé el velo de **70% → 30%**. Ahora las curvas y los toques dorados se ven, y el
contenido sigue legible porque las tarjetas son `bg-card` = **blanco puro**
(`0 0% 100%`), así que resaltan solas sobre el fondo crema.

## Archivo del zip — reemplazar (GitHub web UI)

| Archivo | Acción |
|---|---|
| `app/(app)/cumplimiento/panorama/page.tsx` | **REEMPLAZA** |

> **No** hace falta resubir la imagen: `public/fondo-panorama.webp` ya está bien
> en tu repo (la URL directa la mostró sin problemas). Solo cambia esta página.

## Ajuste fino (si lo querés)

Es un solo número, el `/30` del velo en esta página:
- Querés el fondo **aún más visible** → bajalo a `/20` o `/10`.
- Lo querés **más tenue** → subilo a `/40` o `/50`.

Está en la función `FondoPanorama`, en la línea del `bg-background/NN`.
