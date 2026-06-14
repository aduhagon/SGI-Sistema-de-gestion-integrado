# Fase 3 — Que la configuración tenga efecto (menú + multinorma)

Conecta la configuración del superadmin con el comportamiento real del sistema.

## Qué cambia

### 1. El menú respeta los módulos habilitados
Si en "Configuración del sistema" → Módulos apagás un módulo (ej: Indicadores),
desaparece del menú lateral para todos. Los módulos núcleo (Procesos,
Documentos) no se pueden apagar, así que siempre están.

Mapeo item de menú → módulo: Cumplimiento→cumplimiento, Riesgos→riesgos,
Indicadores→indicadores, Auditorías→auditorias, No conformidades→no_conformidades.

### 2. El panorama de cumplimiento se adapta a multinorma
Si multinorma = false (una sola norma):
- El encabezado dice "Cumplimiento normativo" en vez de "multinorma".
- Se oculta la tarjeta "Normas activas".
- Los textos dejan de decir "todas las normas".
- Muestra solo la norma activa (sin lenguaje comparativo).

Si multinorma = true: todo igual que hoy.

## Lo que ya está en la base (aplicado)

`fn_perfil_menu_usuario` ahora devuelve también `modulos_habilitados` (lista de
códigos de módulos habilitados). Aditivo, no rompe nada.

## Archivos a subir

**Reemplazar:**
1. `lib/api/perfil-menu.ts` — agrega `modulosHabilitados` al perfil (y mantiene
   `esSuperadmin`).
2. `components/layout/SidebarNav.tsx` — cada item de calidad declara su `modulo`
   y se oculta si está deshabilitado.
3. `app/(app)/cumplimiento/panorama/page.tsx` — condicionado a multinorma.

**Nuevo (si no lo tenés del fix anterior):**
4. `lib/api/config-sistema.ts` — ahora incluye también el helper `esMultinorma()`.
   Si ya subiste config-sistema.ts antes, reemplazalo por este (tiene el helper
   nuevo al final).

## Importante sobre el orden de archivos

- `perfil-menu.ts` de este paquete reemplaza al anterior (suma modulosHabilitados
  encima de esSuperadmin). Es acumulativo: tiene todo.
- `SidebarNav.tsx` de este paquete reemplaza al anterior (tiene el ítem de
  superadmin + el filtro por módulo). También acumulativo.

## Cómo probarlo

1. Subí los archivos. Build verde.
2. Como superadmin, andá a Configuración del sistema → Módulos.
3. Apagá "Indicadores" → Guardar.
4. Recargá: "Indicadores" desaparece del menú.
5. Volvé a encenderlo → reaparece.
6. Probá multinorma: apagalo → el panorama deja de hablar de "todas las normas".

> Tras cambiar config, puede hacer falta recargar para que el menú se actualice
> (el layout se revalida, pero el navegador puede cachear).

## Checklist

- [ ] Reemplazados perfil-menu.ts, SidebarNav.tsx, panorama/page.tsx.
- [ ] config-sistema.ts con el helper esMultinorma (nuevo o reemplazo).
- [ ] Build verde.
- [ ] Apagar un módulo lo saca del menú; encenderlo lo devuelve.
- [ ] multinorma=false adapta el panorama (sin lenguaje multinorma).
- [ ] Los módulos núcleo no se pueden apagar.
