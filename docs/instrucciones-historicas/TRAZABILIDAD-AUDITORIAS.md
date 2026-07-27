# Trazabilidad del ciclo de auditoría

Extiende el bloque de trazabilidad al módulo de auditorías: quién planificó,
quién inició, quién emitió el informe, quién lo devolvió y por qué, quién
aprobó el cierre. **Todas las vueltas del ciclo, no sólo la última.**

## Lo que ya está aplicado en la base

Migraciones 051 a 055, probadas end-to-end con rollback sobre AUD-2026-004:

- **051** — tabla append-only `decisiones_informe_auditoria` (RLS con
  `update`/`delete` denegados, `select` siguiendo la visibilidad de la
  auditoría). Columnas nuevas en `auditorias`: `iniciada_por`,
  `cancelada_por`, `fecha_cancelacion`, `motivo_cancelacion`.
  Backfill de AUD-2026-004 desde `eventos_auditoria`.
- **052** — las cuatro funciones del ciclo registran su decisión.
  `fn_cancelar_auditoria` es nueva, con motivo obligatorio.
- **053** — trigger de actor extendido a `auditorias` + constraints de
  cancelación, inicio y cierre.
- **054** — `fn_trazabilidad_auditoria`, misma firma que las de NC y hallazgo.
- **055** — **corrección de un bug pre-existente**: `chk_auditorias_estado_fechas`
  no contemplaba el estado `informe_emitido`, así que *toda emisión de informe
  fallaba*. El módulo estaba trabado en su transición central.

## Archivos

**Nuevos / reemplazo (van en el ZIP):**

1. `lib/api/trazabilidad.ts` — reemplaza al del paquete 087. Suma
   `obtenerTrazabilidadAuditoria` y las etapas del ciclo de auditoría.
2. `components/ncs/TrazabilidadCiclo.tsx` — reemplaza al del 087. Suma las
   etiquetas de auditoría, el chip de vuelta, el resalte ámbar de los
   retrocesos (devolución, reapertura, cancelación) y el aviso de cuántas
   veces se devolvió el informe.

**Reemplazo (va por editor web de GitHub, NO por ZIP):**

3. `app/(app)/auditorias/[id]/page.tsx` — tu archivo actual con tres imports,
   dos llamadas sumadas al `Promise.all` existente, y el bloque al final.
   Nada más cambia.

## Si todavía no subiste el 087

Los dos archivos del ZIP son versiones más completas de los del 087: subí
directamente estos y salteá los del paquete anterior. Lo que **sí** seguís
necesitando del 087 es su `page.tsx` de NC, que va por editor web a
`app/(app)/ncs/[id]/page.tsx`.

## Orden de subida

Primero el ZIP, después el `page.tsx` por editor web. Al revés el build queda
roto entre paso y paso.

## Nota sobre la ubicación del componente

`TrazabilidadCiclo` vive en `components/ncs/` y lo importan las dos fichas.
Es el mismo criterio que ya usa `BotonCerrar`, que también está en
`components/ncs/` y lo usa auditorías. Si preferís moverlo a
`components/common/`, hay que ajustar los imports de las dos páginas.

## Checklist

- [ ] Subidos `lib/api/trazabilidad.ts` y `components/ncs/TrazabilidadCiclo.tsx`.
- [ ] Reemplazado `app/(app)/auditorias/[id]/page.tsx` por editor web.
- [ ] Build verde.
- [ ] Abrir AUD-2026-004: debe mostrar "Planificó" e "Inició" a tu nombre,
      con tu puesto a la fecha de cada acto.
- [ ] Abrir una auditoría planificada: debe mostrar sólo "Planificó".
- [ ] **Probar la emisión de informe**, que hasta la migración 055 fallaba
      siempre. Con el checklist completo, emitir el informe de AUD-2026-004 y
      confirmar que aparece el paso "Emitió el informe · vuelta 1".

## Pendiente

El bloque en hallazgos. `fn_trazabilidad_hallazgo` ya está en la base y el
helper ya la expone, pero el montaje requiere tocar
`components/auditorias/SeccionHallazgos.tsx` (componente cliente) y
posiblemente `lib/api/hallazgos.ts`. Va como paquete 089.
