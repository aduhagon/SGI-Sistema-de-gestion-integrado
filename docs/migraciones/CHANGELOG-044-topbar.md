# Add-on 044 — Barra superior parametrizable (TopBar)

Migra `components/layout/TopBar.tsx` para que la barra superior responda al tema,
en lugar de tener el azul `#0f1f3d` y derivados hardcodeados.

Se agregan 3 tokens nuevos al sistema: `--sidebar`, `--sidebar-foreground`,
`--sidebar-accent`. El TopBar nuevo NO usa ningún color hardcodeado: todo sale
de esos tokens (con opacidades de Tailwind para los matices).

## Archivos en este paquete

- `components/layout/TopBar.tsx` — versión completa migrada (reemplaza el actual).
- `lib/tema/default.ts`, `lib/schemas/apariencia.ts`,
  `components/configuracion/GestionApariencia.tsx` — ya incluyen los 3 tokens nuevos
  (aparecen en el panel bajo el grupo "Barra superior").

## Pasos manuales (2 archivos tuyos)

### 1) `app/globals.css` — agregar los 3 tokens al `:root`

Dentro del bloque `@layer base { :root { … } }`, sumá estas líneas (los valores son
los actuales exactos, así que la barra se ve igual que hoy):

```css
    --sidebar: 219 61% 15%;
    --sidebar-foreground: 214 32% 91%;
    --sidebar-accent: 215 100% 75%;
```

### 2) `tailwind.config.ts` — exponer los tokens como colores

Dentro de `theme.extend.colors`, sumá:

```ts
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
        },
```

Esto habilita las clases `bg-sidebar`, `text-sidebar-foreground`,
`text-sidebar-accent`, `border-sidebar-accent`, etc. que usa el TopBar nuevo.
Las opacidades (`bg-sidebar-foreground/[0.08]`, `border-sidebar-accent/35`)
funcionan solas porque Tailwind las deriva del color base con canal alfa.

### 3) Reemplazar el TopBar

Pisá `components/layout/TopBar.tsx` con el de este paquete. No cambió ninguna
lógica (handlers, refs, efectos, búsqueda, signOut son idénticos) — solo las
clases de color.

## Resultado

| Antes (hardcodeado) | Después (token) |
|---|---|
| `bg-[#0f1f3d]` | `bg-sidebar` |
| `text-slate-200` | `text-sidebar-foreground` |
| `text-slate-300/400` | `text-sidebar-foreground/80` · `/60` |
| `text-[#0f1f3d]` (sobre blanco) | `text-sidebar` |
| `bg-white` (logo/avatar) | `bg-sidebar-foreground` |
| `#7db4ff` / `#a5ccff` / `#bcd6ff` | `text-sidebar-accent` (+ opacidad) |
| `rgb(125 180 255 / X)` | `bg-sidebar-accent/X` · `border-sidebar-accent/X` |

Verificado: 0 colores hardcodeados en el TopBar nuevo, `tsc --noEmit` limpio.

## Nota de diseño

Unifiqué los 3 azules claros del buscador (`#7db4ff`, `#a5ccff`, `#bcd6ff`) en un
solo `--sidebar-accent` con opacidades. Visualmente queda prácticamente idéntico y
deja un solo control en el panel en vez de tres casi-iguales. Si en algún caso
querés los tres matices exactos por separado, se pueden agregar como tokens
adicionales, pero no lo recomiendo: complica el panel sin beneficio real.
