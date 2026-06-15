# Tablero de control — filtro por norma

Agrega un selector de norma arriba del tablero para tamizar los procesos por norma.

## Cómo funciona

- Un desplegable "Norma" con "Todas las normas" + cada norma activa.
- Al elegir una norma (ej: ISO 9001), el tablero muestra **solo los procesos que
  tienen algo vinculado a esa norma** (documentos que la cubren o NC asociadas a
  sus requisitos).
- **NC y documentos** se recalculan filtrados por esa norma.
- **Indicadores y riesgos** se muestran completos (no tienen norma asignada, así
  que no se filtran — se respeta tal como están).
- "Todas las normas" = vista completa (como hasta ahora).

Con tus datos: al filtrar ISO 9001 aparecen 2 procesos (EST-COM amarillo por su NC
de ISO 9001, OP-AGR verde por sus documentos). El resto se oculta porque no toca
esa norma.

## Lo que ya está aplicado en la base

`fn_mapa_calor_procesos(p_norma_id uuid DEFAULT NULL)` — ahora acepta el filtro
opcional. Sin parámetro funciona igual que antes. Ya verificada.

## Archivos (3)

1. **`lib/api/mapaCalor.ts`** (reemplazo) — la función acepta `normaId` y se agrega
   `obtenerNormasParaTablero()`. Reemplaza el del paquete anterior.
2. **`components/tablero/FiltroNorma.tsx`** (nuevo) — el selector de norma.
3. **`app/(app)/tablero/page.tsx`** (reemplazo) — lee el filtro de la URL y monta
   el selector. Reemplaza el del paquete anterior.

> El componente `MapaCalor.tsx` NO cambia (el del paquete anterior sigue igual).

## Cómo funciona técnicamente

El filtro usa el query param `?norma=ID` en la URL. Así el estado del filtro queda
en la URL (se puede compartir el link a "tablero filtrado por ISO 9001").

## Checklist

- [ ] Reemplazado `lib/api/mapaCalor.ts`.
- [ ] Subido `components/tablero/FiltroNorma.tsx` (nuevo).
- [ ] Reemplazado `app/(app)/tablero/page.tsx`.
- [ ] Build verde.
- [ ] En el Tablero aparece el selector "Norma".
- [ ] Al elegir una norma, se filtran los procesos.
