# Detalle de documento — con botón "Nueva versión" + "Aprobar (admin)"

Esta es tu página de detalle completa, con **los dos botones** integrados:

- **"Nueva versión"** — arriba a la derecha del título. Lleva a crear una versión
  nueva del documento.
- **"Aprobar (admin)"** — en la tarjeta "Aprobación administrativa" de la columna
  principal (el que ya tenías).

Un solo archivo para reemplazar, sin editar nada a mano.

## Archivo

`app/(app)/documentos/[id]/page.tsx` — **reemplazar** por el incluido.

> Incluye todo lo anterior (aprobar admin, coberturas, enviar a aprobación, etc.)
> + el botón "Nueva versión". Nada se pierde.

> Depende de archivos que ya existen en tu repo: la página
> `/documentos/[id]/nueva-version` y el `NuevaVersionForm` (verificados, están
> presentes). El botón solo los enlaza.

## Cómo crear una nueva versión (el flujo completo)

1. Entrás al detalle del documento (ya aprobado/vigente).
2. Arriba a la derecha, botón **"Nueva versión"**.
3. Te lleva al formulario: subís el archivo corregido + escribís el **motivo del
   cambio**.
4. Se crea la versión nueva en estado **borrador**. La versión vigente actual
   sigue siendo la oficial mientras tanto.
5. Cuando quieras que la nueva pase a vigente, la aprobás (con el botón "Aprobar
   (admin)" o, en el futuro, el circuito de firmas).
6. Al aprobarse la nueva versión, **la anterior queda obsoleta automáticamente**
   (lo hace el trigger de la base). No tenés que reconciliar nada a mano.

El botón "Nueva versión" no aparece en documentos obsoletos (no tiene sentido
versionar algo discontinuado).

## Diferencia clave (para que no se confunda con "Cargar documento")

- **Cargar documento** (listado): documento que NO existe. Código nuevo.
- **Nueva versión** (detalle): revisar uno que YA existe. Mismo código, versión
  siguiente.

## Checklist

- [ ] Reemplazada `app/(app)/documentos/[id]/page.tsx`.
- [ ] Build verde.
- [ ] En el detalle de un documento vigente aparece "Nueva versión" arriba a la
      derecha.
- [ ] Al tocarlo, abre el formulario de nueva versión.
- [ ] Subir archivo + motivo crea la versión nueva en borrador.
- [ ] Aprobarla la pone vigente y obsoleta la anterior automáticamente.
