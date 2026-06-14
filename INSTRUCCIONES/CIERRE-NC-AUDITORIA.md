# Cierre de NC y auditorías (con validación estricta)

Agrega el cierre de no conformidades y auditorías, para que dejen de figurar como
pendientes. Con **validación estricta** ISO:

- **NC** → solo se cierra si todas sus acciones están completadas o canceladas
  (ninguna planificada / en curso / vencida). Requiere motivo de cierre.
- **Auditoría** → solo se cierra si no tiene NCs abiertas (vinculadas a sus
  hallazgos) ni acciones abiertas. Requiere conclusiones.

Si hay pendientes, el sistema **bloquea** el cierre y explica por qué.

## Lo que ya está en la base (aplicado y probado)

- `fn_cerrar_nc(p_nc_id, p_motivo)`
- `fn_cerrar_auditoria(p_auditoria_id, p_conclusiones)`

Probadas contra tus datos reales: NC-2026-003 (sin acciones) cierra; NC-2026-002
(1 acción abierta) bloquea; AUD-2026-001 (1 NC abierta) bloquea.

Respaldo: `migraciones/025_cierre_nc_auditoria.sql`.

## Archivos a subir

**Nuevos:**
1. `app/(app)/ncs/[id]/cerrar-nc-actions.ts` — server action de NC.
2. `app/(app)/auditorias/[id]/cerrar-auditoria-actions.ts` — server action de auditoría.
3. `components/ncs/BotonCerrar.tsx` — botón + diálogo reutilizable (sirve para ambos).

**Editar (montar el botón en cada detalle):**
4. `app/(app)/ncs/[id]/page.tsx`
5. `app/(app)/auditorias/[id]/page.tsx`

## 4. Montar en el detalle de NC

En `app/(app)/ncs/[id]/page.tsx`:

```tsx
import { BotonCerrar } from "@/components/ncs/BotonCerrar";
import { cerrarNC } from "@/app/(app)/ncs/[id]/cerrar-nc-actions";
```

Donde tengas las acciones de la NC (header o sidebar), y solo si la NC NO está
cerrada (`nc.estado !== "cerrada"`):

```tsx
{nc.estado !== "cerrada" && (
  <BotonCerrar
    entidadId={nc.id}
    accionCerrar={cerrarNC}
    etiqueta="no conformidad"
    campoLabel="Motivo de cierre"
    placeholder="Cómo se resolvió la no conformidad y por qué se cierra…"
    notaValidacion="Solo se puede cerrar si todas las acciones están completadas o canceladas. Queda registrado el motivo y la fecha."
  />
)}
```

## 5. Montar en el detalle de auditoría

En `app/(app)/auditorias/[id]/page.tsx`:

```tsx
import { BotonCerrar } from "@/components/ncs/BotonCerrar";
import { cerrarAuditoria } from "@/app/(app)/auditorias/[id]/cerrar-auditoria-actions";
```

Solo si la auditoría está `planificada` o `en_curso`:

```tsx
{["planificada", "en_curso"].includes(auditoria.estado) && (
  <BotonCerrar
    entidadId={auditoria.id}
    accionCerrar={cerrarAuditoria}
    etiqueta="auditoría"
    campoLabel="Conclusiones"
    placeholder="Conclusiones generales de la auditoría…"
    notaValidacion="Solo se puede cerrar si no quedan no conformidades ni acciones abiertas de esta auditoría."
  />
)}
```

> El componente `BotonCerrar` es genérico: recibe la acción y los textos por
> props, por eso el mismo sirve para los dos casos. Está en `components/ncs/` pero
> lo usás también para auditorías (si preferís moverlo a `components/common/`,
> ajustá el import).

## Cómo funciona

1. En el detalle de una NC abierta (o auditoría), botón **"Cerrar..."**.
2. Se abre el diálogo pidiendo motivo / conclusiones.
3. Si hay pendientes (acciones o NCs abiertas), muestra el error explicando qué
   falta — no cierra.
4. Si está todo en orden, cierra y la entidad deja de figurar como pendiente en
   los tableros.

## Checklist

- [ ] Subidas las 2 server actions + el `BotonCerrar.tsx`.
- [ ] Montado el botón en el detalle de NC (si no está cerrada).
- [ ] Montado el botón en el detalle de auditoría (si planificada/en curso).
- [ ] Build verde.
- [ ] Probar: cerrar una NC sin acciones abiertas → cierra; con acciones
      abiertas → bloquea con mensaje.
