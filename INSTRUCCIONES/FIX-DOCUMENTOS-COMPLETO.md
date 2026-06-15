# Fix build — documentos.ts completo (con documento_padre_id)

El build falla porque el tipo `DocumentSummary` todavía no tiene
`documento_padre_id`, que el componente de la grilla usa para ordenar por
jerarquía. El diff no llegó a aplicarse al tipo.

## Solución: reemplazar el archivo completo

Para evitar la fricción del diff manual, acá está el `lib/api/documentos.ts`
**completo y ya modificado**. Solo reemplazalo entero.

Qué tiene de nuevo respecto al que está en el repo: el campo `documento_padre_id`
agregado en 4 lugares (el tipo DocumentSummary, el tipo DocumentoRaw, la función
normalizar, y el SELECT). Todo lo demás queda idéntico — las 13 exportaciones
intactas.

## Archivo a reemplazar (1)

`lib/api/documentos.ts` — reemplazá el archivo completo por este.

## Después de esto

El componente `GrillaDocumentosSeleccionable.tsx` (versión ExcelJS que ya subiste)
va a compilar, porque el tipo ya tiene el campo que usa.

## Checklist
- [ ] Reemplazado `lib/api/documentos.ts` por el de este paquete.
- [ ] Build verde.
- [ ] La lista ordena por jerarquía y exporta a Excel.
