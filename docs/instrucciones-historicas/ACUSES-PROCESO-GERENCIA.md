# Acuses — vistas por proceso y por gerencia

Suma dos miradas complementarias a la vista por usuario que ya tenías, con un
selector de pestañas en la misma pantalla (/acuses-pendientes).

## Las tres vistas

- **Por usuario** (la que ya existía) — quién tiene acuses pendientes.
- **Por proceso** (nueva) — % de cumplimiento de acuses agrupado por el proceso
  del documento. Útil para ver qué procesos tienen su documentación leída.
- **Por gerencia** (nueva) — % de cumplimiento agrupado por la gerencia de la
  persona (vía su puesto vigente). Útil para que un gerente vea su área.

Cada tarjeta (proceso o gerencia) muestra: % al día (con barra de color
verde/amarillo/rojo), firmados, pendientes y vencidos.

## Lo que ya está aplicado en la base

- `fn_acuses_por_proceso()` — agrupa por proceso del documento.
- `fn_acuses_por_gerencia()` — agrupa por gerencia (persona → puesto → área →
  gerencia). Ambas verificadas.

## Nota sobre los totales

Los totales por proceso y por gerencia pueden diferir entre sí (y de la vista por
usuario), porque cada eje cuenta los acuses desde su ángulo. Es esperado, no es un
error: un mismo documento genera acuses para varias personas de distintas áreas.

## Archivos (4)

1. **`lib/api/acusesAgregados.ts`** (nuevo) — helpers de las dos vistas nuevas.
2. **`components/acuses/AcusesAgrupados.tsx`** (nuevo) — la grilla de tarjetas
   (sirve para proceso y gerencia).
3. **`components/acuses/SelectorVistaAcuses.tsx`** (nuevo) — las pestañas
   Usuario / Proceso / Gerencia.
4. **`app/(app)/acuses-pendientes/page.tsx`** (reemplazo) — integra el selector y
   las tres vistas. Sigue siendo gestor-only.

## Cómo funciona

El selector cambia el query param `?vista=proceso` / `?vista=gerencia`. "Por
usuario" es la vista por defecto (sin parámetro). Se puede compartir el link a una
vista puntual.

## Checklist

- [ ] Subidos los 3 archivos nuevos.
- [ ] Reemplazado `app/(app)/acuses-pendientes/page.tsx`.
- [ ] Build verde.
- [ ] En Acuses pendientes aparecen las pestañas Usuario / Proceso / Gerencia.
- [ ] Cada vista muestra los datos agrupados con su % de cumplimiento.
