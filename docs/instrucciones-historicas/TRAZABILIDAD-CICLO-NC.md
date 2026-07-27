# Trazabilidad de actores del ciclo CAPA

Registra y muestra **quién abrió, quién evaluó y quién cerró** cada no
conformidad, hallazgo y acción correctiva.

## Lo que ya está aplicado en la base

Migraciones 044 a 050, todas verificadas contra datos reales:

- **044** — columnas nuevas: `cerrado_por_usuario_id`,
  `aceptado_riesgo_por_usuario_id` + `fecha_aceptacion_riesgo`,
  `reabierto_por_usuario_id` + `fecha_reapertura` en `no_conformidades`;
  `cerrado_por_usuario_id`, `aceptado_riesgo_por_usuario_id` +
  `fecha_aceptacion_riesgo` en `hallazgos`; `completada_por_usuario_id`,
  `cancelada_por_usuario_id` + `fecha_cancelacion` en `acciones`.
  FK con `ON DELETE RESTRICT`: es evidencia de auditoría, no metadata.
- Backfill desde `eventos_auditoria` de los 3 registros históricos que ya
  estaban cerrados (1 hallazgo, 2 acciones). Reconstrucción exacta.
- **047** — `fn_registrar_actor_transicion()` + trigger `BEFORE UPDATE` en las
  tres tablas. Completa el actor en cada transición terminal, sea cual sea la
  vía de escritura. `fn_cerrar_nc` además lo setea explícito.
- **048** — constraints: no se puede cerrar / completar / cancelar / aceptar
  riesgo sin actor registrado.
- **049 / 050** — `fn_trazabilidad_nc(p_nc_id)`,
  `fn_trazabilidad_hallazgo(p_hallazgo_id)`, `fn_puesto_usuario_a_fecha()`,
  `fn_nombre_usuario()`.

> El registro **ya funciona sin este paquete**: el trigger intercepta los
> `UPDATE` que hacen los server actions actuales. Este paquete sólo agrega la
> visualización.

## Archivos

**Nuevos (van en el ZIP):**

1. `lib/api/trazabilidad.ts` — helper que llama las dos RPC.
2. `components/ncs/TrazabilidadCiclo.tsx` — el bloque visual.

**Reemplazo (va por editor web de GitHub, NO por ZIP):**

3. `app/(app)/ncs/[id]/page.tsx` — tu archivo actual + tres líneas: el import,
   `obtenerTrazabilidadNC` dentro del `Promise.all`, y el bloque al final.

## Orden de subida

Primero los dos del ZIP, después el `page.tsx` por editor web. Si lo hacés al
revés, el build queda roto entre un paso y el otro.

## Detalles de diseño

- **Puesto histórico:** se resuelve a la fecha del acto, no al día de hoy.
  Si la persona cambia de puesto, la ficha vieja sigue mostrando el que tenía
  cuando firmó. Varios puestos simultáneos se separan con `·`.
- **Actos sin actor:** los anteriores a la migración 044 muestran
  "No registrado" en gris, no se ocultan.
- **Cierre forzado:** cuando el SGI cierra sin verificación de eficacia,
  `fn_cerrar_nc` antepone `CIERRE FORZADO` al motivo y el bloque lo marca con
  un aviso ámbar.
- **Acciones:** van resumidas al pie, no como pasos del recorrido.
- Si la RPC falla, el helper devuelve `[]` y el bloque no se renderiza: la
  ficha tiene que abrir igual.

## Checklist

- [ ] Subidos `lib/api/trazabilidad.ts` y `components/ncs/TrazabilidadCiclo.tsx`.
- [ ] Reemplazado `app/(app)/ncs/[id]/page.tsx` por editor web.
- [ ] Build verde.
- [ ] Abrir NC-2026-001: debe mostrar apertura y verificación de C. Di'Staso,
      y la acción ACC-2026-001 al pie.
- [ ] Abrir NC-2026-002: debe mostrar dos verificaciones, una de cada persona.
- [ ] Cerrar una NC de prueba y confirmar que aparece el paso "Cerró" con tu
      nombre y tu puesto.

## Pendiente para el próximo paquete

El bloque de hallazgos: `fn_trazabilidad_hallazgo` ya está en la base y el
helper ya la expone, pero falta montarlo. Los hallazgos no tienen ficha propia
— se muestran dentro de `components/auditorias/SeccionHallazgos.tsx`, así que
el montaje es distinto al de NC.
