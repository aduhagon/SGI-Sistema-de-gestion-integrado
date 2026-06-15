# Sidebar oscuro (navy de marca)

Cambia la barra lateral de blanca a navy (tu azul de marca `#16367f`), para darle
carácter y profundidad a toda la app. Es el cambio de mayor impacto visual tocando
un solo componente.

## Qué cambia

- Fondo del sidebar: navy de marca.
- Texto de los ítems: blanco (tenue cuando inactivo, pleno cuando activo/hover).
- Ítem activo: fondo blanco translúcido (`white/15`) — se resalta claramente.
- Logo invertido: cuadrado blanco con la "M" en navy.
- Encabezados de sección y footer: blanco tenue.

El resto de la app (contenido, topbar) no se toca: el cambio está contenido dentro
del `<aside>`. La unión navy/blanco con el contenido crema queda limpia.

## Archivo a reemplazar (1)

`components/layout/SidebarNav.tsx`

Los 12 ítems del menú, la lógica de visibilidad por rol/módulo y el resto quedan
idénticos — solo cambian los colores.

## Nota

Usé el hex `#16367f` (tu primary `224 71% 31%`) directo en el componente, para no
tener que tocar el `globals.css` ni crear tokens nuevos. Si más adelante querés
afinar el tono exacto, se cambia en este archivo.

## La topbar

La dejamos para una próxima ronda, como acordamos. Este cambio no la afecta.

## Checklist

- [ ] Reemplazado `components/layout/SidebarNav.tsx`.
- [ ] Build verde.
- [ ] El sidebar se ve navy, con los ítems en blanco y el activo resaltado.
- [ ] El logo quedó como cuadrado blanco con M navy.
