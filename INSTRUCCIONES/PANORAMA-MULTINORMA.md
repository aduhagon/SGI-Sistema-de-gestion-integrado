# Tablero panorámico multinorma

Vista consolidada que muestra el estado de cobertura de **todas las normas a la
vez**, de un vistazo, con link a la matriz detallada de cada una. Complementa la
matriz por-norma existente (`/cumplimiento`), no la reemplaza.

## Qué muestra

- **Consolidado global**: cobertura % de todas las normas juntas, cantidad de
  normas activas, y total de requisitos críticos sin cubrir.
- **Una tarjeta por norma**: % de cobertura, requisitos cubiertos/totales, barra
  de progreso, cantidad sin cubrir y críticos sin cubrir. Cada tarjeta linkea a
  `/cumplimiento?norma=<id>` (la matriz detallada que ya tenés).

> Datos reales de hoy (verificados): ISO 9001 3% · ISO 14001 3% · ISO 45001 0% ·
> BRCGS 0%. 43 críticos sin cubrir en total. El tablero va a reflejar el avance a
> medida que vincules documentos a requisitos.

## Archivos

**1. Nuevo — `app/(app)/cumplimiento/panorama/page.tsx`**
Subílo tal cual (incluido). Ya pasó chequeo de tipos.

**2. Función nueva en `lib/api/matriz.ts`**
Pegá el contenido de `obtenerPanoramaNormas.snippet.ts` **al final** de tu
`lib/api/matriz.ts`. Usa `createClient` que ese archivo ya importa arriba, así
que no agregues imports nuevos.

## 3. Enlazar la vista (para que se pueda llegar)

El tablero queda en `/cumplimiento/panorama`. Para que sea accesible, sumá un
acceso. Dos opciones (elegí una o ambas):

### a) Desde la matriz actual (rápido)
En `app/(app)/cumplimiento/page.tsx`, en el header (cerca de los botones de
exportar), agregá un link al panorama:

```tsx
<Link
  href="/cumplimiento/panorama"
  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
>
  Ver panorama
</Link>
```

(El `Link` de next/link ya está importado en esa página.)

### b) Desde el sidebar (recomendado)
Si querés que sea una entrada propia del menú, en tu navegación
(`SidebarNav.tsx` o el sidebar que uses) sumá un ítem apuntando a
`/cumplimiento/panorama`. Podés dejar "Cumplimiento" → matriz y agregar
"Panorama" como subentrada, o al revés (panorama como entrada principal, ya que
es la vista de un vistazo, y la matriz como detalle).

> Sugerencia de UX: que el panorama sea la **puerta de entrada** del módulo
> (entrás y ves todas las normas), y desde cada tarjeta bajás a la matriz
> detallada. Eso lo lográs apuntando el ítem "Cumplimiento" del menú a
> `/cumplimiento/panorama`.

## Rendimiento

`obtenerPanoramaNormas` hace **una sola consulta** agregada (no N llamadas a
`obtenerMatriz`), así que es liviana aunque sumes más normas.

## Checklist

- [ ] Subido `app/(app)/cumplimiento/panorama/page.tsx`.
- [ ] Pegada `obtenerPanoramaNormas` al final de `lib/api/matriz.ts`.
- [ ] Agregado al menos un acceso (link en la matriz o ítem de menú).
- [ ] Build verde.
- [ ] Entrar a `/cumplimiento/panorama`: se ven las 4 normas con su % y los
      críticos sin cubrir; al tocar una, lleva a su matriz.
