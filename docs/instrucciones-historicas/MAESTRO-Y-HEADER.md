# Listado maestro + acceso desde el header (paquete completo)

Trae todo junto para que quede funcionando de una: el listado maestro
jerárquico, el botón para acceder desde el header, y la grilla de obsoletar (que
todavía no habías integrado en la página).

## Qué incluye

1. **Listado maestro** (`/documentos/maestro`): árbol proceso → documento padre →
   hijos.
2. **Botón "Listado maestro"** en el header del listado de documentos, al lado de
   "Cargar documento".
3. **Grilla de obsoletar** en el listado (checkboxes para gestores) — venía
   pendiente de integrar.

## Archivos a subir

**Nuevos:**
1. `lib/api/arbolMaestro.ts`
2. `components/documentos/ArbolMaestro.tsx`
3. `app/(app)/documentos/maestro/page.tsx`

**Reemplazar:**
4. `app/(app)/documentos/page.tsx` — listado con la grilla de obsoletar + el
   botón "Listado maestro" en el header.
5. `components/documentos/GrillaDocumentosSeleccionable.tsx` — versión con el prop
   `puedeObsoletar` (control por rol). Si ya la habías reemplazado con la del
   paquete anterior, esta es idéntica; subila igual por las dudas.

> Depende de cosas que ya están en tu repo: la server action
> `obsoletar-lote-actions.ts`, `obtenerPerfilMenu`, `listarDocumentos`,
> `obtenerDatosForm`, `DocumentFilters`, `DocumentEmptyState`. Nada nuevo de eso.

## Lo que vas a ver

- En **Documentos**, arriba a la derecha: dos botones — "Listado maestro"
  (contorno) y "Cargar documento" (lleno).
- Tocás "Listado maestro" → vas a `/documentos/maestro`, el árbol jerárquico.
- En el listado normal, como gestor, los checkboxes para obsoletar en lote.

## Verificado

- La página quedó íntegra (un solo `<GrillaDocumentosSeleccionable>`, un solo
  enlace a `/documentos/maestro`).
- El árbol usa tu estructura real (A-INS-05-001-001 como hijo de A-MAN-05-001 en
  OP-AGR).

## Checklist

- [ ] Subidos los 3 archivos nuevos (arbolMaestro.ts, ArbolMaestro.tsx,
      maestro/page.tsx).
- [ ] Reemplazados `documentos/page.tsx` y `GrillaDocumentosSeleccionable.tsx`.
- [ ] Build verde.
- [ ] En /documentos aparece el botón "Listado maestro" en el header.
- [ ] Lleva a /documentos/maestro y se ve el árbol proceso → padre → hijo.
- [ ] En el listado, como gestor, aparecen los checkboxes de obsoletar.
