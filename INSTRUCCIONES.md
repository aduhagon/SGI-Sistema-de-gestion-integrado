# Paquete responsive SGI — pasada completa

Adapta la app a pantallas chicas sin tocar el look desktop. Base de navegación:
`SidebarNav` azul conectado al RPC `fn_perfil_menu_usuario()` (reemplaza al
`Sidebar.tsx` crema estático).

---

## A. Archivos del zip — subir/reemplazar tal cual (vía GitHub web UI)

| Archivo | Acción |
|---|---|
| `components/layout/SidebarMobileContext.tsx` | **NUEVO** — context del drawer mobile |
| `components/layout/SidebarNav.tsx` | **REEMPLAZA** — ahora con aside desktop + drawer mobile |
| `components/layout/TopBar.tsx` | **REEMPLAZA** — hamburguesa + buscador colapsable |
| `app/(app)/layout.tsx` | **REEMPLAZA** — usa SidebarNav + provider + carga de perfil |

> El `components/layout/Sidebar.tsx` viejo (crema) **queda sin uso**. Podés
> borrarlo o dejarlo; ya nadie lo importa. Recomendado borrarlo para evitar
> confusión a futuro.

Estos 4 cubren los puntos **#1 (sidebar drawer + conexión RPC)** y
**#3 (buscador colapsable en mobile)**.

---

## B. Diffs quirúrgicos a mano — #2 Tablas con scroll horizontal

En cada uno de estos archivos hay UN solo wrapper de tabla con esta línea
exacta. Cambiá `overflow-hidden` por `overflow-x-auto` y agregá un ancho mínimo
a la tabla para que no se aplaste:

**Buscar:**
```
<div className="overflow-hidden rounded-lg border border-border">
  <table className="w-full text-sm">
```
**Reemplazar por:**
```
<div className="overflow-x-auto rounded-lg border border-border">
  <table className="w-full min-w-[640px] text-sm">
```

Aplicar el mismo cambio en estos 9 archivos:

- `components/configuracion/GestionNormas.tsx`
- `components/configuracion/GestionRequisitos.tsx`
- `components/configuracion/GestionPersonas.tsx`
- `components/configuracion/GestionProcesos.tsx`
- `components/configuracion/GestionAreas.tsx`
- `components/configuracion/GestionSedes.tsx`
- `components/configuracion/GestionPuestos.tsx`
- `components/riesgos/GestionRiesgos.tsx`
- `app/(app)/cumplimiento/page.tsx`

> Nota: en `cumplimiento/page.tsx` la línea está indentada un nivel más
> (dos espacios extra), pero el texto a buscar/reemplazar es el mismo.

---

## C. Diffs quirúrgicos a mano — #4 Headers responsive

Los títulos `text-4xl` comen mucho alto en mobile. Find-and-replace global,
seguro y mecánico:

**Buscar:** `font-serif text-4xl`
**Reemplazar:** `font-serif text-2xl sm:text-4xl`

Esto aplica en todas las `page.tsx` con header grande (dashboard, documentos,
procesos, riesgos, indicadores, aprobaciones, acuses, configuración, ncs,
auditorías, requisitos-legales, tablero, cumplimiento). El reemplazo es idéntico
en todos; no rompe nada en desktop (de `sm:` para arriba sigue siendo 4xl).

> Si tu editor de GitHub no hace find-and-replace global, podés hacerlo página
> por página: es siempre el mismo cambio.

---

## Verificación tras el deploy de Vercel

1. **Desktop** (>768px): todo igual que antes — sidebar azul fija, buscador
   centrado, sin hamburguesa.
2. **Mobile** (<768px):
   - Aparece la hamburguesa arriba a la izquierda → abre el drawer azul.
   - El drawer se cierra al tocar un ítem, el overlay, o la X.
   - La marca "MSU" muestra solo el logo en pantallas muy chicas (texto desde sm).
   - La lupa abre el buscador a pantalla completa.
   - Las tablas (normas, riesgos, etc.) hacen scroll horizontal en vez de aplastarse.
   - Los títulos de página son más chicos y dejan más aire.
3. **Menú por rol**: un usuario no-gestor debería ver solo Dashboard, Procesos,
   Documentos, Acuses (+ Aprobaciones si es aprobador). Un gestor ve todo.

## Nota sobre el RPC

`SidebarNav` consume `obtenerPerfilMenu()` (que ya existía en
`lib/api/perfil-menu.ts`). Ante cualquier error del RPC, `obtenerPerfilMenu`
devuelve el perfil mínimo: el usuario ve solo los ítems base. Es el
comportamiento seguro (no abre menús de más).
