# Crear NC desde hallazgo (acción directa)

Agrega un botón **"Crear no conformidad"** en cada hallazgo de tipo NC dentro de
la auditoría. Un clic crea la NC con los datos del hallazgo ya copiados (título,
descripción, proceso, requisito, severidad), vincula el hallazgo a la NC, y te
lleva directo a la NC creada.

## Comportamiento

- El botón aparece **solo** en hallazgos de tipo `no_conformidad_mayor` o
  `no_conformidad_menor`.
- Si el hallazgo **ya tiene** una NC asociada, en vez del botón muestra un link
  "Ver no conformidad asociada".
- La NC se crea con origen `auditoria_interna` o `auditoria_externa` según el
  tipo de auditoría, y queda en estado `abierta`.
- El requisito se copia del hallazgo si lo tenía; si no, la NC se crea sin
  requisito (la columna lo permite) y lo completás después desde el detalle.
- El hallazgo pasa a estado `en_tratamiento` al generarse la NC.

## Archivos

**Nuevos (subir):**
1. `app/(app)/auditorias/[id]/crear-nc-desde-hallazgo.ts` — server action.
2. `components/auditorias/BotonCrearNC.tsx` — botón cliente con estado de carga.

**Reemplazar (versión completa incluida):**
3. `components/auditorias/SeccionHallazgos.tsx` — agrega el botón en cada
   tarjeta de hallazgo. Es tu archivo actual + el botón.
4. `lib/api/hallazgos.ts` — agrega `noConformidadId` al tipo `Hallazgo` y a la
   query `obtenerHallazgosDeAuditoria` (para saber si el hallazgo ya tiene NC).
   Tu archivo actual + ese campo; las demás funciones quedan idénticas.

## Orden de subida

Subí los 4. El orden no importa mucho, pero si querés minimizar ventanas de
build roto: primero los dos nuevos (1 y 2), después los dos reemplazos (3 y 4).
El botón en SeccionHallazgos usa `h.noConformidadId`, que viene del cambio en
`hallazgos.ts`, así que esos dos van juntos.

## Verificado contra tu base

- Tipos de hallazgo que generan NC: `no_conformidad_mayor`,
  `no_conformidad_menor` (los otros tres no).
- La NC de auditoría exige hallazgo vinculado (`chk_nc_auditoria_tiene_hallazgo`)
  — la action lo cumple porque vincula el hallazgo en el insert.
- `generarCodigoNC` se importa de `@/lib/api/ncs`, `obtenerUsuarioActualId` de
  `@/lib/api/aprobaciones` (igual que tu `crearNC` original).
- FK `hallazgos_auditoria_id_fkey` usada para traer el tipo de auditoría.

## Cómo probarlo

1. Entrá a una auditoría que tenga un hallazgo de tipo "no conformidad mayor" o
   "menor" sin NC asociada.
2. En ese hallazgo, tocá **"Crear no conformidad"**.
3. Te lleva a la NC recién creada (`/ncs/<id>?creada=1`), con título y
   descripción del hallazgo.
4. Volvé a la auditoría: ese hallazgo ahora muestra "Ver no conformidad
   asociada" en vez del botón.

> Si el hallazgo no tenía requisito, la NC queda sin requisito. Completalo desde
> el detalle de la NC (el selector de requisito que ya está).

## Checklist

- [ ] Subidos los 2 archivos nuevos.
- [ ] Reemplazados `SeccionHallazgos.tsx` y `lib/api/hallazgos.ts`.
- [ ] Build verde.
- [ ] En un hallazgo NC: aparece "Crear no conformidad"; al tocarlo crea la NC y
      redirige; el hallazgo pasa a mostrar "Ver no conformidad asociada".
