# Acuses pendientes por usuario

Vista para que el administrador vea **quién tiene documentos sin firmar** y pueda
reclamar la lectura. Agrupada por usuario: cada persona es una tarjeta con la
lista de documentos que le falta acusar.

## Cómo se ve

- Cada **usuario** es una tarjeta colapsable con su nombre, email, cantidad de
  pendientes y cuántos están **vencidos** (en rojo).
- Adentro, la lista de documentos pendientes: código, título, versión y la fecha
  de vencimiento (con aviso si ya venció).
- Cada documento es clickeable (lleva a su detalle).
- Botón **"Enviar recordatorio por email"**: abre tu cliente de correo con un
  mensaje prearmado listando los documentos pendientes de esa persona. Justo para
  reclamar.
- Los usuarios con acuses vencidos aparecen primero.

Solo la ven los **gestores** (administradores del SGI).

## Archivos a subir (nuevos)

1. `lib/api/acusesPendientes.ts` — obtiene los datos (RPC).
2. `components/acuses/AcusesPorUsuario.tsx` — la vista agrupada.
3. `app/(app)/acuses-pendientes/page.tsx` — la página, en `/acuses-pendientes`.

> La función de base `fn_acuses_pendientes_por_usuario` ya está aplicada en
> producción. Respaldo en `migraciones/024_acuses_pendientes_por_usuario.sql`.

## Cómo llegar a la página

Queda en `/acuses-pendientes`. Para tener un acceso, podés agregar un enlace en la
página de acuses (`/acuses`) o en el menú lateral. Si querés, te paso ese cambio
aparte. Mientras tanto, entrás directo por URL.

## Estado actual

Hoy hay **0 acuses pendientes** (los 4 que existen están firmados), así que vas a
ver el mensaje "No hay acuses pendientes". Eso es correcto. La vista se va a
poblar cuando se generen acuses nuevos — esto pasa al aprobar documentos que
requieren acuse de lectura (`requiere_acuse_lectura = true`).

> Probado con un acuse pendiente simulado (en transacción reversible): la vista
> agrupa bien por usuario, cuenta los vencidos y arma la lista. Funciona; solo
> falta que haya pendientes reales.

## Verificado contra tu base

- `acuses_lectura`: pendiente = `fecha_acuse IS NULL`. Persona vía
  `usuario → persona`. Documento vía `acuse → versión → documento`.
- El email sale de `personas.email`.
- Hay un constraint `chk_acuses_acuse_implica_firma` (firma y fecha de acuse van
  juntas) — no afecta esta vista, que es solo de lectura.

## Checklist

- [ ] Subidos los 3 archivos nuevos.
- [ ] (Opcional) Enlace a `/acuses-pendientes` desde /acuses o el menú.
- [ ] Build verde.
- [ ] En /acuses-pendientes (como gestor): si hay pendientes, se ven agrupados
      por usuario; si no, el mensaje de "sin pendientes".
