# Topbar — opción 4 (buscador con tinte navy)

Le suma color a la barra superior para que combine con el sidebar navy, sin
oscurecerla. La topbar queda blanca; el navy aparece en el buscador y los íconos.

## Qué cambia

- Buscador: fondo navy muy tenue + borde navy tenue (se intensifica al enfocar).
- Lupa del buscador: en navy de marca.
- Placeholder y atajo ⌘K: en navy tenue.
- Ícono de la campana: en navy.
- El avatar ya estaba en navy (se mantiene). El resto de la topbar: blanca.

## Archivos a reemplazar (2)

1. `components/layout/TopBar.tsx` — el buscador con tinte navy.
2. `components/layout/CampanaNotificaciones.tsx` — el ícono de la campana en navy
   (solo el del botón; el resto del componente intacto, incluido el badge verde de
   no leídas).

## Nota

Usé el hex `#16367f` (tu primary) con opacidades para los tintes, igual que en el
sidebar. Autocontenido, no toca el resto de la app.

## Checklist

- [ ] Reemplazados TopBar.tsx y CampanaNotificaciones.tsx.
- [ ] Build verde.
- [ ] El buscador tiene un tinte azul tenue y la lupa + campana en navy.
- [ ] La topbar sigue clara y combina con el sidebar.
