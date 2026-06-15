# Paquete responsive SGI — v2 (sidebar crema)

Vuelve al sidebar **crema** con grupos colapsables (Inicio / Gestión / Análisis /
Sistema), hardcodeado (solo `esSuperadmin`, sin RPC de menú). Marca MSU única en
el TopBar. Mantiene todo el responsive: drawer mobile, tablas con scroll, headers.

Esto corrige los dos problemas de la captura:
- **Marca duplicada** → ahora la marca vive solo en el TopBar; el sidebar arranca
  directo con los grupos.
- **Agrupaciones perdidas** → vuelven los 4 grupos colapsables con chevron y contador.

---

## A. Archivos del zip — subir/reemplazar tal cual (vía GitHub web UI)

| Archivo | Acción |
|---|---|
| `components/layout/SidebarMobileContext.tsx` | **NUEVO** — context del drawer mobile |
| `components/layout/Sidebar.tsx` | **REEMPLAZA** — crema, grupos colapsables, + drawer mobile |
| `components/layout/TopBar.tsx` | **REEMPLAZA** — marca única + hamburguesa + buscador colapsable |
| `app/(app)/layout.tsx` | **REEMPLAZA** — usa Sidebar (crema) + provider del drawer |

> Si en el paso anterior subiste `SidebarNav.tsx`, **podés borrarlo**: este
> paquete no lo usa. El layout vuelve a importar `Sidebar`.

Estos 4 cubren **#1 (sidebar drawer)** y **#3 (buscador colapsable en mobile)**.

---

## B. Diffs a mano — #2 Tablas con scroll horizontal

En cada archivo hay UN wrapper de tabla con esta línea exacta. Cambiá
`overflow-hidden` por `overflow-x-auto` y agregá ancho mínimo a la tabla:

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

Aplicar en estos 9 archivos:

- `components/configuracion/GestionNormas.tsx`
- `components/configuracion/GestionRequisitos.tsx`
- `components/configuracion/GestionPersonas.tsx`
- `components/configuracion/GestionProcesos.tsx`
- `components/configuracion/GestionAreas.tsx`
- `components/configuracion/GestionSedes.tsx`
- `components/configuracion/GestionPuestos.tsx`
- `components/riesgos/GestionRiesgos.tsx`
- `app/(app)/cumplimiento/page.tsx`

---

## C. Diffs a mano — #4 Headers responsive

**Buscar:** `font-serif text-4xl`
**Reemplazar:** `font-serif text-2xl sm:text-4xl`

Find-and-replace global. No cambia nada en desktop (de `sm:` para arriba sigue 4xl).

---

## Verificación tras el deploy

1. **Desktop** (>768px): sidebar crema con los 4 grupos colapsables, marca solo
   en el TopBar (sin duplicado), sin hamburguesa.
2. **Mobile** (<768px):
   - Hamburguesa arriba a la izquierda → abre el drawer crema (con su propia
     cabecera de marca + botón X, para orientar).
   - El drawer se cierra al tocar un ítem, el overlay o la X.
   - Lupa → buscador a pantalla completa.
   - Tablas con scroll horizontal; títulos más chicos.
3. **Superadmin**: "Configuración del sistema" aparece solo si `fn_es_superadmin`
   devuelve true. El resto de los ítems los ve todo el mundo (hardcodeado, sin RPC).
