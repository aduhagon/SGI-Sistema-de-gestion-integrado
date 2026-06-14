# Documentos — grilla con obsoletar en lote

Agrega selección múltiple (checkboxes) al listado de documentos para marcar
varios como **obsoletos (discontinuados)** de una sola vez, con un motivo común.
La parte de base de datos **ya está aplicada en producción**; falta subir el
frontend.

## Concepto (importante)

"Obsoletar un documento" = discontinuarlo: queda fuera del sistema vivo
(`estado_actual = 'obsoleto'`, sin versión vigente). Es distinto de "versión
obsoleta" (que es consecuencia automática de aprobar una versión nueva, y
pertenece al flujo de aprobación, no a esto).

Solo se pueden obsoletar documentos que NO estén ya obsoletos (los obsoletos
aparecen con el checkbox deshabilitado).

## Lo que ya está en la base (no hay que correr nada)

- Columnas nuevas en `documentos`: `motivo_obsolescencia`, `obsoletado_en`,
  `obsoletado_por`.
- Función `fn_obsoletar_documentos(p_documento_ids uuid[], p_motivo text)` que
  valida sesión y motivo (mín. 5 caracteres), marca obsoleto, limpia la versión
  vigente y registra autor/fecha. El trigger de auditoría de `documentos` deja
  registro automático del cambio.
- Respaldo SQL en `migraciones/021_obsoletar_documentos_lote.sql` (solo para tu
  historial; ya está aplicada).

## Archivos a subir

**Nuevos:**
1. `app/(app)/documentos/obsoletar-lote-actions.ts` — server action que llama a
   la RPC.
2. `components/documentos/GrillaDocumentosSeleccionable.tsx` — la grilla con
   checkboxes, barra de acciones flotante y diálogo de motivo.

**Editar:**
3. `app/(app)/documentos/page.tsx` — usar la grilla en vez del listado simple.

## 3. Editar la página de listado

En `app/(app)/documentos/page.tsx`:

### 3.1 Import

```diff
+import { GrillaDocumentosSeleccionable } from "@/components/documentos/GrillaDocumentosSeleccionable";
```

(podés sacar el import de `DocumentRow` si ya no lo usás en esta página.)

### 3.2 Reemplazar el bloque de listado

Buscá el bloque que hoy renderiza el encabezado de columnas + el map de
`DocumentRow` (el `<div>` con las cabeceras "Código / Documento / Tipo · Proceso
· Normas / Actualizado" y abajo `documentos.map((doc) => <DocumentRow .../>)`).
Reemplazá **todo ese bloque** (encabezado + map) por:

```tsx
<GrillaDocumentosSeleccionable documentos={documentos} />
```

> La grilla ya trae su propio encabezado de columnas con el checkbox de
> "seleccionar todos", así que reemplaza tanto la cabecera como las filas. La
> leyenda de estados del footer podés dejarla como está.

> Si tu `DocumentSummary` tiene exactamente los campos que usa la grilla (id,
> codigo, titulo, descripcion_corta, estado_actual, actualizado_en, creado_en,
> tipo, proceso, normas), no hace falta tocar nada más. Son los mismos que ya
> usaba `DocumentRow`.

## Cómo funciona

1. Tildás uno o varios documentos (o "seleccionar todos" en la cabecera).
2. Aparece una barra flotante abajo: "N seleccionados · Marcar como obsoletos".
3. Al confirmar, se abre un diálogo que pide el **motivo común** (obligatorio).
4. Se marcan todos en una sola operación; muestra cuántos se obsoletaron y
   cuántos se omitieron (los que ya estaban obsoletos o no se pudieron).

El checkbox vive fuera del link de cada fila, así que tildar no navega al
detalle; el resto de la fila sigue llevando al documento.

## Restricción de permisos (recomendado)

Esta grilla permite una acción de gestión fuerte (discontinuar documentos).
Conviene que el listado de documentos —o al menos la capacidad de obsoletar— sea
para gestores. Si querés, en una próxima iteración condicionamos la barra de
acciones a `esGestor` (como hicimos con el historial de versiones). Por ahora la
función de base ya exige sesión válida; sumar el filtro por rol es una mejora.

## Cómo probarlo

1. Subí los 2 archivos nuevos + editá la página.
2. Build.
3. En /documentos: tildá uno o dos documentos (los que no estén obsoletos).
4. Barra flotante → "Marcar como obsoletos" → escribí un motivo → Confirmar.
5. Los documentos pasan a estado obsoleto (StatusDot gris) y salen como
   discontinuados.

> Probá con cuidado: obsoletar es una acción real. Para una prueba inocua, podés
> obsoletar un documento de prueba y luego, si hace falta revertir, se puede
> hacer desde la base (cambiar estado_actual de vuelta).

## Checklist

- [ ] Subido `obsoletar-lote-actions.ts`.
- [ ] Subido `GrillaDocumentosSeleccionable.tsx`.
- [ ] Editada `documentos/page.tsx` (import + reemplazo del bloque de listado).
- [ ] Build verde.
- [ ] Selección múltiple funciona; el diálogo pide motivo; obsoletar marca los
      documentos y refresca el listado.
