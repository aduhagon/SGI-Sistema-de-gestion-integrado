# Fondo del mapa de procesos (mapa antiguo atenuado)

Agrega la imagen del mapa antiguo como fondo **sutil** de la pantalla de procesos,
optimizada para que no afecte el rendimiento.

## Rendimiento

- La imagen original (JPEG 313 KB) se optimizó a **WebP de 153 KB** (menos de la
  mitad), con un suavizado leve que para un fondo atenuado es imperceptible.
- Se carga como capa CSS de fondo (`background-image`), no como `<img>` que
  bloquee el render: los procesos aparecen primero, el fondo se pinta detrás.
- Impacto en rendimiento: mínimo / imperceptible.

## Cómo se ve

- El mapa va al **7% de opacidad**, con un velo de gradiente encima, así los
  procesos (tarjetas, texto) se leen perfectamente.
- Es un fondo decorativo sutil que combina con la estética serif/cálida del SGI.

## Archivos (2)

### 1. La imagen → carpeta `public/`

`public/mapa-procesos-fondo.webp`

> **Importante (GitHub web UI):** la carpeta `public/` ya existe en tu repo. Para
> subir la imagen: entrá a la carpeta `public` en GitHub, "Add file" → "Upload
> files", y subí `mapa-procesos-fondo.webp`. NO crees una carpeta public nueva.

### 2. La página → reemplazar

`app/(app)/procesos/page.tsx` — la versión nueva envuelve el contenido con la capa
de fondo. Todo lo demás (las tres bandas, el header, el footer) queda idéntico.

## Si querés ajustar la intensidad

En `procesos/page.tsx`, la línea con `opacity-[0.07]` controla qué tan visible es
el mapa. Subila a `0.10` o `0.12` si lo querés un poco más presente, o bajala a
`0.05` si lo querés más tenue. Avisame y lo ajusto.

## Checklist

- [ ] Subida `public/mapa-procesos-fondo.webp` (a la carpeta public existente).
- [ ] Reemplazado `app/(app)/procesos/page.tsx`.
- [ ] Build verde.
- [ ] En Procesos: se ve el mapa de fondo sutil, y los procesos se leen bien.
