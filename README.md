# Paquete frontend SGI — Backlog cerrado

Generado para Ale · MSU SGI Multinorma

Este paquete cubre los puntos del backlog frontend que pediste:

1. ✅ **Confirmación de eliminado** con componente reutilizable
   `ConfirmarEliminacion` (motivo obligatorio → `eliminado_motivo`).
2. ✅ **Menú lateral por rol** usando `fn_perfil_menu_usuario`.
3. ✅ **Códigos sugeridos** en riesgos (`fn_sugerir_codigo_riesgo`) e
   indicadores (`fn_sugerir_codigo_indicador`).
4. ✅ **Ícono para `documento_rechazado`** en la campana.
5. ✅ **Retoques de lenguaje llano** (en el componente nuevo; sugerencias para
   el resto en el instructivo).

---

## ⚠️ Leé esto primero

Este NO es un zip de "reemplazá las carpetas y listo". Es deliberadamente
**mixto**, por una razón de seguridad para tu producción:

- **Archivos nuevos** (carpetas `components/`, `lib/`): subílos tal cual, son
  completos y ya pasaron chequeo de tipos.
- **Cambios sobre archivos existentes**: van como **instructivo de diff** en
  `INSTRUCCIONES/INTEGRACION.md`, no como archivos para pisar. Esto evita que
  reemplaces tus actions/componentes reales (que tienen lógica que no conviene
  sobrescribir, como las funciones `traducir` de cada módulo) con versiones
  reconstruidas. Cada cambio está descripto como "buscá esto → poné esto".
- **Snippets** (carpeta `snippets/`): funciones nuevas y cortas para **agregar**
  al final de tus actions de riesgos e indicadores.

Todo lo que toca la base fue verificado contra tu proyecto Supabase real
(`hghzpuvxggvpgwzpzaqw`): existen las tres funciones, el valor
`documento_rechazado` del enum, y las funciones de sugerencia devuelven los
códigos esperados (`R-01-01`, `O-01-01`, `KPI-01-01`).

---

## Contenido del zip

```
paquete/
├── README.md                          ← este archivo
├── INSTRUCCIONES/
│   └── INTEGRACION.md                 ← el paso a paso con todos los diffs
├── components/
│   ├── ui/
│   │   └── ConfirmarEliminacion.tsx   ← NUEVO · diálogo reutilizable
│   └── layout/
│       └── SidebarNav.tsx             ← NUEVO · navegación por rol
├── lib/
│   └── api/
│       └── perfil-menu.ts             ← NUEVO · helper de fn_perfil_menu_usuario
└── snippets/
    ├── sugerir-codigo-riesgo.ts       ← agregar a riesgos/actions.ts
    └── sugerir-codigo-indicador.ts    ← agregar a indicadores/actions.ts
```

---

## Orden recomendado para subir (de menor a mayor riesgo)

1. **Campana** (1 archivo, 2 líneas) — bajo riesgo, efecto inmediato.
   → `INTEGRACION.md` §4
2. **Archivos nuevos** — subí `ConfirmarEliminacion.tsx`, `perfil-menu.ts` y
   `SidebarNav.tsx`. No rompen nada por sí solos.
3. **Snippets de sugerencia** — pegá las dos funciones en sus actions.
   → `INTEGRACION.md` §6.2 / §7.2
4. **Riesgos e indicadores** — código sugerido + confirmación. → §6 y §7
5. **Sidebar por rol** — el cambio en `Sidebar.tsx`. → §5
6. **ABMs de configuración** — confirmación de eliminado (patrón uniforme). → §8
7. **Lenguaje llano** — opcional. → §9

Después de cada bloque conviene dejar que Vercel buildee, así si algo falla
sabés exactamente qué commit lo introdujo.

---

## Nota sobre lo que dejé fuera a propósito

- **persona-puesto**: usa `motivo_revocacion` (cierre de vigencia SCD2), no
  soft-delete. Para no tocar el flujo de revocación de participaciones (que
  llama al RPC `fn_revocar_participaciones_de_puesto`), lo dejé fuera. Si querés
  que también pida motivo al usuario, decímelo y lo armo aparte.
- **Coberturas y versiones de norma**: tienen soft-delete y entran en el mismo
  patrón del §8 si querés sumarlas; no las incluí en el checklist principal para
  mantener el primer deploy acotado. Avisame y las agrego.
  
