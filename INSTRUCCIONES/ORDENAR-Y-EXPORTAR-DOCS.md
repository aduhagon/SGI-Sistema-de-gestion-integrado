# Documentos — ordenar + exportar a Excel

Suma a la lista de documentos: un selector "Ordenar por" (jerarquía / proceso /
código / fecha) y un botón "Exportar a Excel".

## Qué hace

**Ordenar por:**
- **Jerarquía** (por defecto): cada documento padre seguido de sus hijos.
- **Proceso**: agrupados por el proceso, y dentro por código.
- **Código**: orden alfanumérico natural.
- **Fecha**: más reciente primero.

**Exportar a Excel:**
- Si hay documentos tildados → exporta SOLO los seleccionados.
- Si no hay selección → exporta TODOS los visibles (respetando los filtros activos).
- El botón muestra cuántos va a exportar cuando hay selección.
- Genera un `.xlsx` con columnas: Código, Título, Descripción, Estado, Tipo,
  Proceso, Normas, Actualizado. Nombre del archivo: `documentos-sgi-AAAA-MM-DD.xlsx`.

## IMPORTANTE — Agregar la dependencia `xlsx`

El componente usa la librería `xlsx` (SheetJS), que NO está en tu proyecto. Sin
esto, el build de Vercel falla. Editá `package.json`:

En la sección `"dependencies"`, agregá esta línea (respetando el orden alfabético
si querés, pero no es obligatorio):

```json
    "xlsx": "0.18.5",
```

Por ejemplo, si tenés:
```json
  "dependencies": {
    "next": "14.2.15",
    "react": "^18",
    ...
  }
```
queda:
```json
  "dependencies": {
    "next": "14.2.15",
    "react": "^18",
    "xlsx": "0.18.5",
    ...
  }
```

Vercel instala la dependencia automáticamente en el próximo build. (No necesitás
correr npm install localmente.)

## Archivos (3)

**Diff (cambio quirúrgico):**
1. `lib/api/documentos.ts` — seguí `diffs/DIFF-documentos-padre-id.md`. Suma el
   campo `documento_padre_id` al summary (4 cambios chicos), necesario para ordenar
   por jerarquía. NO reemplaces el archivo entero.

**Reemplazos:**
2. `components/documentos/GrillaDocumentosSeleccionable.tsx` — el selector de orden
   + el botón exportar + la lógica. (Incluye también los refinamientos visuales del
   paquete anterior: hover, acento rechazado).
3. `components/documentos/StatusDot.tsx` — (de los refinamientos; si ya lo subiste,
   está igual, podés omitirlo).

**Editar:**
4. `package.json` — agregar `"xlsx": "0.18.5"` en dependencies.

## Orden de subida

1. Editá `package.json` (la dependencia).
2. Aplicá el diff de `documentos.ts`.
3. Subí los componentes.

Si subís el componente antes de agregar la dependencia, el build falla con "Cannot
find module 'xlsx'". Por eso el package.json va primero.

## Checklist

- [ ] Agregado `"xlsx": "0.18.5"` en package.json.
- [ ] Aplicado el diff de documento_padre_id en documentos.ts.
- [ ] Reemplazado GrillaDocumentosSeleccionable.tsx (y StatusDot.tsx si hace falta).
- [ ] Build verde.
- [ ] Aparece el selector "Ordenar por" y el botón "Exportar a Excel".
- [ ] Ordenar por jerarquía muestra padres con hijos debajo.
- [ ] Exportar sin selección baja todos; con tildados baja solo esos.
