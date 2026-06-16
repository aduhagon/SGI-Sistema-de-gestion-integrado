# Documentos — ordenar + exportar a Excel (con ExcelJS)

Suma el selector "Ordenar por" (jerarquía / proceso / código / fecha) y el botón
"Exportar a Excel" a la lista de documentos.

## CORRECCIÓN respecto al intento anterior

El build falló porque el componente usaba `xlsx`, que no está en el proyecto.
**Tu proyecto YA tiene `exceljs`** instalado — así que esta versión usa ExcelJS y
NO hay que tocar el package.json. Más simple y sin dependencias nuevas.

## Qué hace

**Ordenar por:** jerarquía (padre→hijos), proceso, código, fecha.

**Exportar a Excel:**
- Con documentos tildados → exporta solo esos.
- Sin selección → exporta todos los visibles (con los filtros activos).
- Genera un `.xlsx` (ExcelJS) con: Código, Título, Descripción, Estado, Tipo,
  Proceso, Normas, Actualizado. Encabezado en negrita. Archivo:
  `documentos-sgi-AAAA-MM-DD.xlsx`.

## Archivos (2)

**Diff (cambio quirúrgico):**
1. `lib/api/documentos.ts` — seguí `diffs/DIFF-documentos-padre-id.md`. Suma el
   campo `documento_padre_id` al summary (4 cambios chicos), necesario para el
   orden por jerarquía. NO reemplaces el archivo entero.

**Reemplazo:**
2. `components/documentos/GrillaDocumentosSeleccionable.tsx` — selector de orden +
   botón exportar (con ExcelJS) + la lógica. Incluye también los refinamientos
   visuales (hover, acento rechazado).

## NO hace falta tocar package.json

A diferencia del intento anterior: ExcelJS ya está en tus dependencias. Si llegaste
a agregar `"xlsx"` al package.json, podés quitarlo (no se usa) o dejarlo (no
molesta), pero lo limpio es quitarlo.

## Orden de subida

1. Aplicá el diff de `documentos.ts` (documento_padre_id).
2. Reemplazá `GrillaDocumentosSeleccionable.tsx`.

## Checklist

- [ ] Aplicado el diff de documento_padre_id en documentos.ts.
- [ ] Reemplazado GrillaDocumentosSeleccionable.tsx (versión ExcelJS).
- [ ] (Opcional) Quitado "xlsx" del package.json si lo habías agregado.
- [ ] Build verde.
- [ ] Aparece "Ordenar por" y "Exportar a Excel".
- [ ] Exportar baja un .xlsx que abre bien en Excel.
