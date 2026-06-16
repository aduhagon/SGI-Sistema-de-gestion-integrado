# Acceso a "Acuses pendientes por usuario" desde la página de acuses

Agrega un botón **"Pendientes por usuario"** en el header de la página de acuses
(`/acuses`), visible **solo para gestores**, que lleva a la vista de acuses
pendientes agrupados por usuario (`/acuses-pendientes`).

## Dónde aparece

En **Acuses** (`/acuses`), arriba a la derecha del título, los gestores ven el
botón "Pendientes por usuario". El usuario común no lo ve (sigue viendo solo su
bandeja personal de acuses).

## Archivo (reemplazar)

`app/(app)/acuses/page.tsx` — tu página actual + el botón en el header. Todo lo
demás (tu bandeja personal de acuses) queda idéntico.

> Requiere que ya tengas subida la vista de acuses pendientes (paquete anterior:
> `acuses-pendientes/page.tsx`, `AcusesPorUsuario.tsx`, `acusesPendientes.ts`) y
> la función de base, que ya está aplicada.

## Cómo se usa

1. Como gestor, entrás a **Acuses**.
2. Arriba a la derecha, botón **"Pendientes por usuario"**.
3. Te lleva a la vista agrupada: cada persona y los documentos que le falta
   firmar, con la opción de mandar recordatorio por email.

## Checklist

- [ ] Reemplazada `app/(app)/acuses/page.tsx`.
- [ ] Build verde.
- [ ] Como gestor, en /acuses aparece el botón "Pendientes por usuario".
- [ ] El botón lleva a /acuses-pendientes.
- [ ] Como usuario común, el botón NO aparece.
