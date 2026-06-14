# Aprobación administrativa (atajo para puesta en marcha)

## Tu situación

No tenés documentos aprobados/vigentes porque el **circuito formal de aprobación**
(envío a aprobación → firmas N1/N2) todavía no está operativo en la UI. Eso te
deja los documentos trabados en "pendiente de aprobación" o "borrador", y sin
documentos vigentes no podés avanzar (ni versionar, ni que aparezcan como
oficiales).

Este atajo te permite, **como gestor**, aprobar un documento y ponerlo vigente
directamente, salteando el circuito de firmas. Es para la **etapa de carga
inicial**, no el flujo definitivo.

## Por qué es seguro

Lo importante: tu base **ya tiene** un trigger (`fn_sincronizar_version_vigente`)
que, cuando una versión se marca vigente, hace automáticamente y de forma atómica:

1. Obsoleta las versiones anteriores vigentes del mismo documento.
2. Actualiza el documento: `version_vigente_id` + `estado_actual = 'aprobado'`.

O sea, la integridad de la vigencia (tu concepto de "una nueva pone obsoleta la
anterior, sin reconciliar a mano") ya está garantizada por la base. El atajo solo
saltea las **firmas**, no la integridad de datos. Y exige un **motivo** que queda
registrado en la versión.

## Lo que ya está en la base (aplicado)

Función `fn_aprobar_documento_admin(p_documento_id, p_motivo)`:
- Valida sesión y motivo (mín. 5 caracteres).
- Marca la última versión del documento como `aprobado` + `es_vigente = true`,
  completando `fecha_aprobado` (respeta el constraint que lo exige).
- El trigger hace el resto. Verificado en transacción de prueba: el documento
  queda `aprobado` y vigente correctamente.
- Respaldo: `migraciones/022_aprobacion_admin.sql`.

## Archivos a subir

**Nuevos:**
1. `app/(app)/documentos/[id]/aprobar-admin-actions.ts` — server action.
2. `components/documentos/BotonAprobarAdmin.tsx` — botón + diálogo de motivo.

**Editar:**
3. `app/(app)/documentos/[id]/page.tsx` — montar el botón (solo gestores, solo si
   el documento no está vigente).

## 3. Montar el botón en el detalle

En `app/(app)/documentos/[id]/page.tsx`:

### 3.1 Imports

```diff
+import { BotonAprobarAdmin } from "@/components/documentos/BotonAprobarAdmin";
+import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
```

### 3.2 Cargar el perfil

Donde la página obtiene los datos del documento, sumá:

```tsx
const perfil = await obtenerPerfilMenu();
```

### 3.3 Montar el botón en el header

En el `<header>`, junto al título (o donde tengas las acciones), agregá el botón
condicionado: solo gestores, y solo si el documento todavía NO está vigente
(estados borrador / confeccionado / pendiente_aprobacion / rechazado):

```tsx
{perfil.esGestor &&
  ["borrador", "confeccionado", "pendiente_aprobacion", "rechazado"].includes(
    doc.estado_actual,
  ) && <BotonAprobarAdmin documentoId={doc.id} />}
```

> Si ya agregaste el botón "Nueva versión" del paquete anterior, podés poner los
> dos juntos en el mismo contenedor flex a la derecha del título.

## Cómo se usa

1. Entrás al detalle de un documento pendiente (como gestor).
2. Tocás **"Aprobar (admin)"**.
3. Escribís el motivo (ej: "Carga inicial del SGI").
4. Confirmás → el documento queda **aprobado y vigente**, y su versión queda
   marcada vigente. Si había una versión vigente anterior, queda obsoleta sola.

## Importante: esto es transitorio

Es un atajo de puesta en marcha, no el circuito real. Cuando construyas el flujo
de aprobación con firmas (N1/N2), conviene:
- Restringir o quitar este botón, o
- Dejarlo solo para casos excepcionales documentados.

El motivo queda registrado en `motivo_cambio` de la versión, así que hay rastro
de qué se aprobó administrativamente.

## Checklist

- [ ] Subida la server action `aprobar-admin-actions.ts`.
- [ ] Subido `BotonAprobarAdmin.tsx`.
- [ ] Editada la página de detalle (imports + perfil + botón condicionado).
- [ ] Build verde.
- [ ] Como gestor, en un documento pendiente: aparece "Aprobar (admin)";
      al confirmar con motivo, el documento pasa a vigente.
- [ ] Verificá que el documento ahora figure como vigente y, si querés, probá
      crear una nueva versión desde él (ahora sí tiene sentido).
