# Mapa de procesos — indicadores de salud en las tarjetas

Cada tarjeta del mapa de procesos muestra ahora chips con su "salud": cantidad
de documentos vigentes, indicadores activos y NC abiertas (estas últimas en rojo
si hay). Convierte el mapa de vista estática en tablero operativo de un vistazo.

## Archivos

**1. Nuevo — `lib/api/saludProcesos.ts`**
Subílo tal cual (incluido). Función `obtenerSaludProcesos()` que devuelve un mapa
`procesoId -> {documentos, ncAbiertas, indicadores}`.

**2. Reemplazar — `components/procesos/ProcessCard.tsx`**
Versión completa incluida. Agrega el campo opcional `salud` al tipo
`ProcessSummary` y los chips al pie de la tarjeta. Es retrocompatible: si una
tarjeta no recibe `salud`, no muestra chips (no rompe otros usos del componente).

**3. Reemplazar — `app/(app)/procesos/page.tsx`**
Versión completa incluida. Carga `obtenerSaludProcesos()` en paralelo con los
procesos e inyecta la salud en cada uno.

> `components/procesos/ProcessBand.tsx` NO se toca: ya pasa el proceso entero a
> `ProcessCard`, así que el campo `salud` viaja solo.

## Qué cuenta cada chip (verificado contra tu base)

- **Documentos**: `documentos.proceso_principal_id` = proceso, no eliminados.
  (Ojo: la relación es `proceso_principal_id`, no `proceso_id`.)
- **Indicadores**: `indicadores.proceso_id` = proceso, activos. Solo se muestra
  el chip si hay al menos 1.
- **NC abiertas**: `no_conformidades.proceso_id` = proceso, en estado
  `abierta`, `en_analisis` o `en_tratamiento`. Se muestra en rojo. Solo aparece
  si hay al menos 1 (un proceso "sano" no muestra el chip rojo).

> Estado real hoy: solo "Producción Agrícola" (OP-AGR) tiene datos (4 docs, 1
> indicador). El resto en cero — es esperable al inicio de la carga. Los chips
> van a poblarse a medida que cargues documentos, indicadores y NCs.

## Rendimiento

`obtenerSaludProcesos` hace **3 consultas** en total (una por documentos, una por
NC, una por indicadores) y agrega en memoria — NO una consulta por proceso. Es
liviano aunque tengas muchos procesos.

## Checklist

- [ ] Subido `lib/api/saludProcesos.ts`.
- [ ] Reemplazado `components/procesos/ProcessCard.tsx`.
- [ ] Reemplazado `app/(app)/procesos/page.tsx`.
- [ ] Build verde.
- [ ] En `/procesos`: las tarjetas con datos muestran chips (ej. OP-AGR muestra
      "4 documentos · 1 indicador"); las vacías muestran solo "0 documentos".
