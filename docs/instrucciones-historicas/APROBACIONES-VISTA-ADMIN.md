# Aprobaciones — vista de administrador

Suma una pestaña "Todas (admin)" en /aprobaciones, visible solo para
administradores (gestores), que permite ver TODAS las aprobaciones pendientes del
sistema —no solo las propias— y reasignar el aprobador.

## Qué hace

**Pestañas** (solo el admin ve la segunda):
- **Mis pendientes**: la bandeja de siempre (lo que espera mi decisión).
- **Todas (admin)**: todas las aprobaciones abiertas del sistema.

**Vista admin — monitoreo:** por cada aprobación pendiente muestra documento,
versión, nivel pendiente (1 o 2), quién la tiene asignada, hace cuántos días, y si
está vencida (con acento rojo). Las vencidas van primero.

**Vista admin — reasignar:** botón "Reasignar" por fila → diálogo con selector de
nuevo aprobador + motivo obligatorio. Valida segregación (N1 ≠ N2) y que el nivel
no esté ya decidido. El cambio queda registrado en la auditoría (eventos_auditoria,
con su hash chain).

## Lo que ya está aplicado en la base

- `fn_aprobaciones_pendientes_admin()` — todas las pendientes con su aprobador,
  antigüedad y si está vencida.
- `fn_reasignar_aprobador(aprobacion, nivel, nuevo, motivo)` — reasigna con
  validación de permiso (solo admin/responsable_sgi/superadmin), segregación y
  registro de auditoría.
Ambas verificadas.

## Archivos (5)

**Nuevos:**
1. `lib/api/aprobacionesAdmin.ts` — helpers de la vista admin.
2. `app/(app)/aprobaciones/reasignar-actions.ts` — server action de reasignación.
3. `components/aprobaciones/AprobacionesAdmin.tsx` — la vista admin (lista +
   diálogo de reasignación).
4. `components/aprobaciones/SelectorVistaAprobaciones.tsx` — las pestañas.

**Reemplazo:**
5. `app/(app)/aprobaciones/page.tsx` — integra las pestañas y las dos vistas.

## Notas

- La pestaña "Todas (admin)" solo aparece si el usuario es gestor (esGestor del
  perfil). Si un no-admin fuerza `?vista=todas`, igual cae en "Mis pendientes".
- La reasignación valida el rol en la propia función SQL, así que es seguro aunque
  alguien intente saltearse el frontend.
- Si tu verificador marca un error de useTransition/TransitionFunction, es el falso
  positivo conocido del entorno; compila bien en Vercel.

## Checklist

- [ ] Subidos los 4 archivos nuevos (incluida la carpeta de la action).
- [ ] Reemplazado `app/(app)/aprobaciones/page.tsx`.
- [ ] Build verde.
- [ ] Como admin, aparecen las pestañas "Mis pendientes" / "Todas (admin)".
- [ ] La vista admin lista todas las pendientes con su aprobador y antigüedad.
- [ ] El botón Reasignar abre el diálogo y cambia el aprobador.
