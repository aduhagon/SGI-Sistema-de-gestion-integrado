# Dashboard — color con intención

Las tarjetas de "Mi actividad pendiente" ahora reaccionan a su estado, y el bloque
informativo de abajo se armoniza con el navy del sidebar.

## Qué cambia

**Tarjetas de actividad pendiente:**
- En cero → tarjeta neutra, ícono y número apagados (gris). "Acá no hay nada".
- Con pendientes → toma un acento según su tono:
  - NCs asignadas → rojo (fondo rosado, ícono y número rojos).
  - Aprobaciones / Acuses → ámbar (atención) cuando hay pendientes.
  - Mis documentos → neutro pero activo (número negro, ícono navy): es informativo,
    no una alerta.

Así, de un vistazo se ve dónde hay algo que requiere atención.

**Bloque informativo de abajo:**
- Pasa del lavanda tenue a una barra de acento navy a la izquierda + fondo navy
  muy sutil + título en navy. Dialoga con el sidebar.

## Archivo a reemplazar (1)

`app/(app)/dashboard/page.tsx`

Toda la lógica de datos (conteos, queries) queda idéntica — solo cambió la
presentación de las tarjetas y el bloque.

## Checklist
- [ ] Reemplazado `app/(app)/dashboard/page.tsx`.
- [ ] Build verde.
- [ ] Las tarjetas en cero se ven apagadas; las que tienen valor, con acento.
- [ ] NCs asignadas (3) se ve en rojo.
- [ ] El bloque de abajo tiene la barra navy.
