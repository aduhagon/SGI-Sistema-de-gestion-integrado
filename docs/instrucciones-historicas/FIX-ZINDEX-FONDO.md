# FIX — el fondo no se veía (z-index)

## Causa

Las capas de fondo estaban con `-z-10` (z-index negativo), que las mandaba detrás
del fondo del layout de la página. La imagen se renderizaba pero quedaba tapada
por el color de fondo del sitio. Por eso no se veía y no había error en consola.

## Solución

- Las capas de fondo pasan de `-z-10` a `z-0`.
- El contenido pasa a `relative z-10` (queda encima del fondo).
- El contenedor raíz tiene `min-h-screen` para que el fondo cubra la pantalla.
- Subí la opacidad del mapa de 0.07 a 0.10 (un poco más visible).

## Archivo a reemplazar (1)

`app/(app)/procesos/page.tsx`

## IMPORTANTE — antes de descartar, confirmá que la imagen se sirve

Abrí en el navegador (en la misma sesión):

```
https://sig-gestordocumental.vercel.app/mapa-procesos-fondo.webp
```

- **Si ves el mapa** → la imagen está OK. Con este fix del z-index, ahora se ve de
  fondo. Reemplazá el page.tsx, esperá el build, recargá con Ctrl+Shift+R.
- **Si ves 404 / not found** → la imagen no entró al build. Forzá un rebuild
  (commit trivial en GitHub) y volvé a probar la URL hasta que muestre el mapa.

## Checklist

- [ ] Verificado que la URL de la imagen muestra el mapa.
- [ ] Reemplazado `app/(app)/procesos/page.tsx`.
- [ ] Build verde + Ctrl+Shift+R.
- [ ] Se ve el fondo atenuado y los procesos se leen bien.
