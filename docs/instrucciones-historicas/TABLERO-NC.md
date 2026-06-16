# Tablero histórico de No Conformidades

Pantalla nueva con el estado histórico de las NC: evolución mensual + tres cortes
(proceso, norma, severidad). Acceso desde un botón "Tablero" en la página de NC.

## Qué muestra

- **Consolidado:** total / abiertas / cerradas.
- **Evolución mensual:** gráfico de barras de NC abiertas (por apertura) y cerradas
  (por cierre) por mes, últimos 12 meses. Se va llenando con el tiempo.
- **Distribución (pestañas):**
  - Por proceso — NC agrupadas por el proceso afectado.
  - Por norma — NC agrupadas por la norma del requisito incumplido.
  - Por severidad — alta / media / baja.
  Cada tarjeta muestra total, abiertas, cerradas y % de cierre.

**Gerencia** quedó pendiente a propósito: las NC no tienen área cargada y los
procesos no se vinculan a gerencia, así que ese corte daría vacío hoy. Se puede
sumar más adelante.

## Lo que ya está aplicado en la base

`fn_nc_por_proceso()`, `fn_nc_por_norma()`, `fn_nc_por_severidad()`,
`fn_nc_evolucion_mensual(p_meses)`. Verificadas.

## Archivos (5)

**Nuevos:**
1. `lib/api/tableroNC.ts` — helper que reúne los 4 cortes.
2. `components/tablero-nc/EvolucionNC.tsx` — gráfico SVG de evolución mensual.
3. `components/tablero-nc/CortesNC.tsx` — pestañas proceso/norma/severidad.
4. `app/(app)/tablero-nc/page.tsx` — la página (gestor-only).

**Reemplazo:**
5. `app/(app)/ncs/page.tsx` — agrega el botón "Tablero" en el header (solo gestores).

## Notas

- Carpeta nueva `app/(app)/tablero-nc/`: al crear el page.tsx en GitHub, escribí la
  ruta completa y se crea sola.
- El gráfico es SVG puro (sin librerías), coherente con el de indicadores.
- Con tus datos actuales (3 NC), el tablero ya muestra los cortes; la evolución se
  irá poblando mes a mes.

## Checklist

- [ ] Subidos los 4 archivos nuevos.
- [ ] Reemplazado `app/(app)/ncs/page.tsx`.
- [ ] Build verde.
- [ ] En No conformidades aparece el botón "Tablero" (como gestor).
- [ ] El tablero muestra consolidado, evolución y los 3 cortes.
