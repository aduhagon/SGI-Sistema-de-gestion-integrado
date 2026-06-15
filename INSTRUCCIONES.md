# Aprobaciones agrupadas por proceso y por usuario

Replica en la bandeja de aprobaciones el patrón de vistas agrupadas que ya tienen
los acuses. Suma dos vistas nuevas al selector: **Por proceso** y **Por usuario**.

## Sin cambios en la base

No hace falta migración. Las dos vistas se construyen en memoria a partir de
`fn_aprobaciones_pendientes_admin()`, que **ya entrega** proceso y aprobador por
fila (verificado en vivo). Solo se agrega código de agregación en TypeScript.

## Archivos del zip — subir/reemplazar (GitHub web UI)

| Archivo | Acción |
|---|---|
| `lib/api/aprobacionesAgregados.ts` | **NUEVO** — agrupa por proceso y por usuario |
| `components/aprobaciones/AprobacionesPorProceso.tsx` | **NUEVO** — tarjetas por proceso |
| `components/aprobaciones/AprobacionesPorUsuario.tsx` | **NUEVO** — fichas por aprobador, con detalle expandible |
| `components/aprobaciones/SelectorVistaAprobaciones.tsx` | **REEMPLAZA** — agrega las 2 pestañas nuevas |
| `app/(app)/aprobaciones/page.tsx` | **REEMPLAZA** — rutea y monta las vistas nuevas |

Los componentes `AprobacionCard.tsx` y `AprobacionesAdmin.tsx` **no se tocan**.

## Cómo queda

El selector (visible solo para gestores, como antes) pasa de 2 a 4 pestañas:

1. **Mis pendientes** — igual que siempre (las que esperan tu decisión).
2. **Todas (admin)** — igual que siempre (monitoreo + reasignación).
3. **Por proceso** — *nueva*. Una tarjeta por proceso con el total de
   aprobaciones pendientes, cuántas están en nivel 1 / nivel 2, y cuántas
   vencidas.
4. **Por usuario** — *nueva*. Una ficha por aprobador asignado con su total y sus
   vencidas; al tocarla se despliega el detalle de cada documento (código,
   título, nivel, días esperando o "vencida"), con link al documento.

Las vistas viven en la URL (`?vista=proceso`, `?vista=usuario`), igual que las de
acuses. Cada vista consulta solo sus datos (no se carga de más).

## Verificación tras el deploy

1. Entrá a `/aprobaciones` como gestor → el selector ahora muestra 4 pestañas.
2. "Por proceso" → tarjetas por proceso; los procesos sin aprobaciones pendientes
   no aparecen. Si un documento no tiene proceso, cae en "Sin proceso asignado".
3. "Por usuario" → fichas por aprobador; tocá una para ver el detalle. "Sin
   aprobador asignado" agrupa las que no tengan aprobador.
4. Un usuario no-gestor sigue viendo solo "Mis pendientes" (sin selector).

## Nota

Las dos vistas nuevas cuentan **aprobaciones pendientes** (no cerradas), que es
lo que devuelve la función admin. No incluyen las ya decididas; para histórico
de decisiones habría que otra fuente. Si lo querés, lo vemos aparte.
