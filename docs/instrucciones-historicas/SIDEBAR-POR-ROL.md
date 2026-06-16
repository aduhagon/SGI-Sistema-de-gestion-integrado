# Sidebar por rol — integración

Hace que el menú lateral muestre/oculte items según el rol del usuario, usando
`fn_perfil_menu_usuario()` (que ya está en la base) y el helper
`lib/api/perfil-menu.ts` (que ya está en el repo).

Hasta ahora el `Sidebar.tsx` era un client component que mostraba todo a todos.
Lo pasamos al patrón server+client: `Sidebar` (server) obtiene el perfil y se lo
pasa a `SidebarNav` (client), que filtra y renderiza.

## Importante: conserva tus cambios

Esta versión del `SidebarNav` tiene los items **al día**, incluido
**Cumplimiento → /cumplimiento/panorama** (tu último cambio). El `SidebarNav.tsx`
que estaba en el repo de antes tenía Cumplimiento apuntando a `/cumplimiento`
(viejo); esta versión lo corrige. Así que reemplazar es seguro, no perdés nada.

## Archivos (reemplazar los 2)

1. `components/layout/Sidebar.tsx` — ahora es un **server component** corto que
   llama a `obtenerPerfilMenu()` y pasa el perfil a `SidebarNav`. Ya NO tiene
   `"use client"`.
2. `components/layout/SidebarNav.tsx` — client component con los items y el
   filtrado por rol.

**El layout NO se toca.** `app/(app)/layout.tsx` ya es async server y monta
`<Sidebar />` sin props, así que funciona tal cual.

## Criterio de visibilidad aplicado

Según los flags reales de `fn_perfil_menu_usuario`:

| Sección / item | Se muestra si |
|---|---|
| Dashboard, Procesos, Documentos, Acuses | siempre |
| Aprobaciones | `esAprobador` o `esGestor` |
| Cumplimiento, Riesgos, Indicadores, Auditorías, NCs | `esGestor` |
| Configuración | `esGestor` |

Donde `esGestor` = rol global `admin`, `responsable_sgi` o `auditor`;
`esAprobador` = participa como aprobador o responsable de algún proceso.

Si un rol no tiene items en una sección, esa sección no se muestra (no queda el
encabezado vacío).

> ¿Querés otro reparto? Editá los predicados `visible:` en `SidebarNav.tsx`. Por
> ejemplo, si querés que riesgos/indicadores los vean también los elaboradores,
> cambiá `(p) => p.esGestor` por `(p) => p.esGestor || p.esElaborador`.

## Cómo probarlo

- Con tu usuario (que es admin/gestor) tenés que seguir viendo **todo** el menú,
  igual que ahora.
- Para verificar el filtrado real necesitás un usuario sin rol de gestor: ese
  debería ver solo Dashboard, Procesos, Documentos, Acuses (y Aprobaciones si es
  aprobador). No vería Cumplimiento, Riesgos, Indicadores, Auditorías, NCs ni
  Configuración.

> Si no tenés a mano un usuario no-gestor, el filtrado igual está activo; con tu
> usuario gestor simplemente ves todo (que es lo correcto).

## Verificado

- `fn_perfil_menu_usuario()` existe y devuelve
  `{ roles, es_gestor, es_aprobador, es_elaborador }`.
- `lib/api/perfil-menu.ts` ya está en el repo.
- El layout ya es server async (no requiere cambios).

## Checklist

- [ ] Reemplazado `components/layout/Sidebar.tsx` (ahora server, sin "use client").
- [ ] Reemplazado `components/layout/SidebarNav.tsx`.
- [ ] Build verde.
- [ ] Con tu usuario gestor: ves todo el menú (incluido Cumplimiento → panorama).
- [ ] El item Cumplimiento queda resaltado tanto en el panorama como en la matriz.
