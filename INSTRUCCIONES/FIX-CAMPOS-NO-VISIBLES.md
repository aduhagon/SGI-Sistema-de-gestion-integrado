# Fix — los campos de norma/requisito no aparecían en la NC

## Qué había pasado

Del instructivo anterior (5 pasos) solo se había aplicado **uno**: subir el
componente `SelectorRequisitoNC.tsx`. Pero ese componente quedó en el repo sin
que nadie lo usara:

- `app/(app)/ncs/nueva/page.tsx` seguía siendo la versión original: no cargaba
  las normas ni los requisitos, y llamaba al form sin esos props.
- `components/ncs/NCForm.tsx` seguía sin importar ni montar el selector.

Por eso no se veía nada: el campo existía como archivo, pero no estaba enchufado
al formulario.

## Solución: reemplazar dos archivos completos

Este paquete trae los **dos archivos enteros, ya modificados**, leídos del
estado actual de tu repo. Subílos pisando los que están:

1. `components/ncs/NCForm.tsx`
   - Importa y monta `<SelectorRequisitoNC>` (después del bloque
     Tipo/Severidad/Origen).
   - Suma los props `normas` y `requisitosPorNorma`.

2. `app/(app)/ncs/nueva/page.tsx`
   - Carga `obtenerNormasConRequisitos()` y arma `requisitosPorNorma`.
   - Pasa esos datos al `<NCForm>`.

El `SelectorRequisitoNC.tsx` ya está en tu repo y no cambió; lo incluyo igual
por si querés tenerlo todo junto, pero no hace falta volver a subirlo.

## Faltan todavía (pasos 1 y 2 del instructivo original)

Reemplazar estos dos archivos hace que **se vean** los campos. Pero para que la
NC **guarde** el requisito y lo **exija**, todavía tenés que aplicar los cambios
chicos en otros dos archivos (si no los hiciste):

### a) `lib/schemas/nc.ts` — requisito obligatorio

Dentro del `z.object({ ... })` de `crearNCSchema`, después de `origen`:

```diff
     origen: z.enum(ORIGENES_NC, {
       errorMap: () => ({ message: "Elegí el origen de la no conformidad." }),
     }),
+    requisitoId: z
+      .string({ required_error: "Elegí el requisito incumplido." })
+      .uuid("Elegí el requisito incumplido."),
     hallazgoId: z.string().uuid().optional().or(z.literal("")),
```

### b) `app/(app)/ncs/nueva/actions.ts` — leer y guardar

En el `safeParse`, sumá:

```diff
     origen: formData.get("origen"),
+    requisitoId: formData.get("requisitoId") || undefined,
     hallazgoId: formData.get("hallazgoId") || undefined,
```

En el `.insert({ ... })`:

```diff
       origen: input.origen,
+      requisito_id: input.requisitoId,
       hallazgo_id: hallazgoId,
```

> Si dejás el schema SIN el `requisitoId` obligatorio pero el componente lo tiene
> como `required`, el navegador igual va a exigirlo al enviar. Pero conviene
> tener ambos: el `required` del HTML (UX) y la validación del schema (servidor).

## Orden recomendado

1. Subí `NCForm.tsx` y `nueva/page.tsx` (este paquete).
2. Aplicá los cambios de `schema` y `actions` (arriba).
3. Build. Entrá a "Abrir no conformidad": ahora tienen que aparecer los dos
   selects (Norma y Requisito) después de Origen.

## Verificación

- [ ] En el form de NC se ven los selects "Norma" y "Requisito incumplido".
- [ ] El select Norma muestra ISO 9001, ISO 45001, ISO 14001 y BRCGS.
- [ ] Al elegir una norma, el select Requisito se puebla con sus cláusulas.
- [ ] No deja crear la NC sin requisito.
- [ ] El `requisito_id` queda guardado en la fila de `no_conformidades`.
