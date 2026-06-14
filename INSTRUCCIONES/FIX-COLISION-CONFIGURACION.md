# FIX URGENTE — colisión de nombre `configuracion.ts` (build roto)

## Qué pasó

Ya existía `lib/api/configuracion.ts` en tu repo: el de la **configuración de
contenido** (áreas, gerencias, normas, puestos, tipos, retención, sedes, etc.).
El panel de superadmin que armé creó otro archivo con **el mismo nombre y ruta**,
y al subirlo **pisó el original**. Por eso el build falla: todas las páginas de
`/configuracion` perdieron sus funciones (`listarAreas`, `listarGerencias`,
`listarTiposDocumentales`, etc.).

Fue un error mío por no chequear que el nombre ya existía. Se arregla en dos
pasos.

## Paso 1 — Restaurar el `configuracion.ts` original (desde GitHub)

El original está intacto en el historial de Git. Para recuperarlo:

1. En GitHub, abrí `lib/api/configuracion.ts`.
2. Arriba a la derecha del archivo, clic en **History** (ícono de reloj).
3. Vas a ver el commit que lo pisó (el más reciente) y los anteriores.
4. Clic en el **commit anterior** al que lo pisó (el que NO dice nada de
   "superadmin"/"config sistema").
5. En esa vista, abrí el archivo y usá el botón **Raw** para ver el contenido
   original completo.
6. Copialo. Volvé a `lib/api/configuracion.ts` en la rama `main`, **editá**, pegá
   el contenido original (reemplazando el mío), y commiteá.

> Alternativa más rápida si la ves: en la vista del archivo en `main`, el botón
> History → en el commit que lo pisó, hay opción de **Revert** solo para ese
> archivo, o "View file" en el commit previo. Cualquier camino que te devuelva el
> contenido original sirve.

Resultado esperado: `configuracion.ts` vuelve a tener `listarAreas`,
`listarGerencias`, `listarTiposDocumentales`, `obtenerConteosConfig`,
`listarPoliticasRetencion`, `listarNormasCatalogo`, `listarProcesosCatalogo`,
`listarPuestos`, `listarAreasParaSelector`, `listarSedes`, etc.

## Paso 2 — Subir mi archivo con OTRO nombre

Mi configuración del sistema ahora se llama **`config-sistema.ts`** (no choca):

1. `lib/api/config-sistema.ts` — **nuevo** (mi API de configuración del sistema).
2. `app/(app)/sistema/page.tsx` — **reemplazar** (ya importa de `config-sistema`).
3. `components/sistema/PanelConfiguracion.tsx` — **reemplazar** (idem).
4. `app/(app)/sistema/config-actions.ts` — igual que antes (no cambió, no importa
   de configuracion). Si ya lo subiste, está bien.

## Orden recomendado

1. Primero el Paso 1 (restaurar el original) — eso solo ya destraba el build.
2. Después el Paso 2 (subir config-sistema.ts + las 2 páginas que lo usan).

Así el build queda verde y el panel de superadmin sigue funcionando, ahora sin
pisar nada.

## Cómo confirmar

- [ ] `configuracion.ts` restaurado (tiene las funciones listar* de nuevo).
- [ ] `config-sistema.ts` subido (mi API del sistema).
- [ ] `sistema/page.tsx` y `PanelConfiguracion.tsx` importan de `config-sistema`.
- [ ] Build verde.
- [ ] /configuracion (áreas, tipos, etc.) funciona como antes.
- [ ] /sistema (panel superadmin) funciona.
