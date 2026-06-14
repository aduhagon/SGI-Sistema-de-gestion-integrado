# Fix — el botón "Completar" de las acciones no hacía nada

## Por qué no funcionaba

Al completar una acción, la base exige (constraint
`chk_acciones_completada_tiene_resultado`) que la acción tenga un **resultado
obtenido** — no se puede marcar "completada" sin describir qué resultado dio. La
función `completarAccion` marcaba el estado pero **no enviaba el resultado**, así
que el UPDATE fallaba en la base. El error volvía, pero no se mostraba de forma
visible, y parecía que "el botón no hace nada".

Es una regla ISO correcta: una acción correctiva se cierra documentando su
resultado. El fix no la saltea: **pide el resultado al completar**.

## Qué cambia

Ahora, al tocar "Completar", se abre un **diálogo que pide el resultado
obtenido**. Lo escribís, confirmás, y la acción se completa (guardando ese
resultado). Si el resultado está vacío, avisa y no completa.

## Archivos a reemplazar (2)

1. `app/(app)/ncs/[id]/accion-actions.ts` — `completarAccion` ahora recibe y
   guarda `resultado_obtenido`. Las demás funciones del archivo (crearAccion,
   registrarVerificacion) quedan idénticas.
2. `components/ncs/GestionAcciones.tsx` — el botón "Completar" abre el diálogo de
   resultado en vez de completar directo.

> No hay cambios en la base (el constraint ya existía y es correcto). Solo se
> corrige el frontend para cumplirlo.

## Por qué importa para el cierre de NC

Esto estaba bloqueando todo el flujo de cierre: para **cerrar una NC** necesitás
que sus acciones estén completadas. Si no podías completar acciones, no ibas a
poder cerrar la NC. Con este fix, el circuito queda destrabado:

1. Completás cada acción (con su resultado).
2. Cuando todas están completadas, podés cerrar la NC.

## Cómo probarlo

1. En el detalle de una NC con una acción abierta (ej: ACC-2026-002), tocá
   "Completar".
2. Se abre el diálogo → escribí el resultado obtenido → "Completar acción".
3. La acción pasa a "Completada".
4. Ahora, si era la última pendiente, ya podés cerrar la NC.

## Verificado

- Probado el UPDATE con `resultado_obtenido` contra tu base (ACC-2026-002): pasa
  el constraint y completa. Sin resultado: bloquea (que era el bug).

## Checklist

- [ ] Reemplazado `app/(app)/ncs/[id]/accion-actions.ts`.
- [ ] Reemplazado `components/ncs/GestionAcciones.tsx`.
- [ ] Build verde.
- [ ] "Completar" abre el diálogo de resultado y completa la acción.
