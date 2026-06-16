# Aprobación administrativa — paquete completo (page lista)

Este paquete trae **todo junto** para que subas archivos completos, sin editar
nada a mano. Incluye la página de detalle ya modificada con el botón montado.

## Qué hace

Agrega un botón **"Aprobar (admin)"** en el detalle de cada documento: como
gestor, ponés el documento vigente directo, sin el circuito de firmas. Atajo para
la puesta en marcha. Pide un motivo (queda registrado). La base ya garantiza la
consistencia (el trigger obsoleta versiones anteriores, etc.).

## Dónde aparece el botón

En el **detalle del documento** (Documentos → clic en un documento), en la
columna principal, aparece una tarjeta **"Aprobación administrativa"** con el
botón verde. Aparece solo si:
- Sos gestor (admin / responsable_sgi / auditor), y
- El documento todavía NO está vigente (estados borrador, confeccionado,
  pendiente_aprobacion o rechazado).

Se ubica cerca de la sección "Enviar a aprobación" (el circuito formal), como
alternativa para cuando ese circuito no se puede usar todavía.

## Archivos a subir (todos completos, sin editar a mano)

1. `app/(app)/documentos/[id]/page.tsx` — **reemplazar**. Es tu página actual con
   el botón ya montado (imports, carga de perfil y la tarjeta de aprobación
   administrativa). Todo lo demás queda idéntico.
2. `app/(app)/documentos/[id]/aprobar-admin-actions.ts` — **nuevo**. La server
   action.
3. `components/documentos/BotonAprobarAdmin.tsx` — **nuevo**. El botón + diálogo.

> La función de base `fn_aprobar_documento_admin` ya está aplicada en producción.
> El respaldo está en `migraciones/022_aprobacion_admin.sql` (no hay que
> correrlo).

## Cómo usarlo

1. Entrás a Documentos → clic en un documento pendiente (como gestor).
2. En la columna principal, tarjeta "Aprobación administrativa" → botón
   **"Aprobar (admin)"**.
3. Escribís el motivo (ej: "Carga inicial del SGI").
4. Confirmás → el documento queda **aprobado y vigente**.

Después de eso, ese documento ya es oficial: aparece como vigente, se le pueden
crear nuevas versiones, cuenta en la matriz de cumplimiento, etc.

## Importante (recordatorio)

Es un atajo de puesta en marcha, no el circuito definitivo. Cuando armes el
circuito real de aprobación con firmas, conviene restringir o quitar este botón.
El motivo queda registrado en la versión, así que hay rastro de las aprobaciones
administrativas.

## Checklist

- [ ] Reemplazada `app/(app)/documentos/[id]/page.tsx`.
- [ ] Subida `app/(app)/documentos/[id]/aprobar-admin-actions.ts`.
- [ ] Subido `components/documentos/BotonAprobarAdmin.tsx`.
- [ ] Build verde.
- [ ] En el detalle de un documento pendiente (como gestor) aparece la tarjeta
      "Aprobación administrativa".
- [ ] Aprobar con motivo → el documento pasa a vigente.
