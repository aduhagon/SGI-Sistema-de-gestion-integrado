# Refinamientos — lista de documentos

Tres pulidos de la lista de documentos.

## Qué cambia

1. **Puntitos de estado más visibles:** el punto pasa de 2.5 a 3 px y el anillo de
   2 a 3 px. Se distinguen mejor a primera vista (verde/azul/ámbar/rojo/gris).
2. **Hover de fila reforzado:** al pasar el mouse, la fila toma un fondo un poco
   más marcado (de muted/40 a muted/60). Se siente más clickeable.
3. **Color con intención en "rechazado":** las filas de documentos rechazados
   toman una barra roja a la izquierda + fondo rojo muy tenue. El ojo va directo a
   lo que requiere corrección. El resto de los estados queda sobrio.

## Archivos a reemplazar (2)

1. `components/documentos/StatusDot.tsx` — punto y anillo más grandes.
2. `components/documentos/GrillaDocumentosSeleccionable.tsx` — hover reforzado +
   acento en filas rechazadas.

Toda la lógica (selección, obsoletar en lote, navegación) queda idéntica.

## Nota typecheck

Si tu verificador marca un error de `useTransition`/`TransitionFunction`, es el
falso positivo conocido del entorno; compila bien en Vercel.

## Checklist
- [ ] Reemplazados StatusDot.tsx y GrillaDocumentosSeleccionable.tsx.
- [ ] Build verde.
- [ ] Los puntitos se ven un poco más grandes y con anillo.
- [ ] El hover de fila se nota más.
- [ ] Una fila rechazada (si hay) se ve con barra y fondo rojo tenue.
