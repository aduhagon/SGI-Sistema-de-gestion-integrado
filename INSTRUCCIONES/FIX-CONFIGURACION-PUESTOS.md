# FIX build — `Puesto` sin gerenciaId

## Qué pasó

El componente `GestionPuestos.tsx` (que subiste) usa `gerenciaId`/`gerenciaNombre`
del tipo `Puesto`, pero el diff que ampliaba ese tipo en `configuracion.ts` no se
había aplicado. Por eso el build falla con "Property 'gerenciaId' does not exist
on type 'Puesto'".

## Solución

En vez del diff manual, acá está `lib/api/configuracion.ts` **completo y ya
modificado**, listo para reemplazar. Tomé tu archivo actual del repo y le apliqué
los dos cambios (tipo `Puesto` + `listarPuestos`), dejando todo lo demás idéntico.

## Archivo a reemplazar (1)

`lib/api/configuracion.ts` — reemplazá el archivo entero por este.

Verificado:
- El tipo `Puesto` ahora tiene `gerenciaId` y `gerenciaNombre`.
- `listarPuestos` resuelve la gerencia (área padre del área del puesto).
- Las 10 funciones (listarAreas, listarGerencias, listarPuestos, listarSedes,
  listarTiposDocumentales, etc.) y todos los tipos siguen intactos.
- El tipo `Area` quedó sin cambios.

## Orden

Con esto el build pasa: el componente `GestionPuestos.tsx` que ya subiste va a
encontrar los campos que necesita.

## Checklist

- [ ] Reemplazado `lib/api/configuracion.ts` por este.
- [ ] Build verde.
- [ ] Configuración → Puestos se ve agrupado por gerencia → área → puesto.
