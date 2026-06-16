# Panel de superadmin — Configuración del sistema (FASE 2)

El panel donde gestionás la configuración global. Aparece en el menú lateral como
**"Configuración del sistema"**, solo para superadmin (vos, aduhagon).

## Qué hace

Cuatro secciones en `/sistema`:

1. **Organización** — nombre y logo de la empresa.
2. **Módulos** — switches para activar/desactivar cada módulo. Los núcleo
   (Procesos, Documentos) no se pueden apagar.
3. **Normas** — switch multinorma sí/no + selección de normas activas.
4. **Correo del sistema** — remitente, nombre y flag de envío. (La credencial NO
   se guarda acá; va en secretos de Supabase — Fase 4.)

Cada sección guarda por separado y muestra "Guardado" al confirmar. La escritura
está protegida en la base: solo superadmin puede cambiar nada.

## Lo que ya está en la base (Fase 1, aplicado)

Rol superadmin (vos ya lo tenés), tablas `configuracion_sistema` y
`modulos_sistema` con defaults, y las funciones de lectura/escritura. Además se
agregó `es_superadmin` a `fn_perfil_menu_usuario` (para el menú).

## Archivos a subir

**Nuevos:**
1. `lib/api/configuracion.ts` — lee config, módulos y normas.
2. `app/(app)/sistema/config-actions.ts` — server actions de guardado.
3. `components/sistema/PanelConfiguracion.tsx` — el panel con las 4 secciones.
4. `app/(app)/sistema/page.tsx` — la página `/sistema` (solo superadmin).

**Reemplazar:**
5. `lib/api/perfil-menu.ts` — ahora incluye `esSuperadmin`.
6. `components/layout/SidebarNav.tsx` — agrega "Configuración del sistema" al
   menú (sección SISTEMA, solo superadmin).

## Cómo se ve

En el menú lateral, sección **SISTEMA**, vas a ver dos ítems: "Configuración" (el
de contenido, como hoy) y **"Configuración del sistema"** (el nuevo, solo vos).
Entrás y gestionás todo desde ahí.

## Importante: por ahora solo guarda, todavía no "aplica"

En esta fase el panel **guarda** la configuración, pero el sistema todavía no
reacciona a esos cambios (eso es la Fase 3): que apagar un módulo lo saque del
menú de todos, que multinorma=false oculte la matriz comparativa, etc. Por ahora,
si apagás un módulo, se guarda apagado pero el menú sigue igual. Lo conectamos en
la Fase 3.

> Nota typecheck: si tu verificador local marca `revalidatePath(path, "layout")`
> con "expected 1 argument", es un falso positivo — esa firma de 2 argumentos es
> API oficial de Next 14 y compila bien en Vercel.

## Checklist

- [ ] Subidos los 4 archivos nuevos.
- [ ] Reemplazados `perfil-menu.ts` y `SidebarNav.tsx`.
- [ ] Build verde.
- [ ] En el menú, sección SISTEMA, aparece "Configuración del sistema" (solo vos).
- [ ] Entrás a /sistema y ves las 4 secciones con los valores actuales.
- [ ] Cambiás el nombre de la organización → "Guardado" → recargás y persiste.
- [ ] Intentás apagar un módulo núcleo → no se puede (switch deshabilitado).
