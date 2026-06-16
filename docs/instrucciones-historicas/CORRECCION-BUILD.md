# Corrección del build — snippets de sugerencia de código

## Qué pasó

La carpeta `snippets/` del paquete anterior se subió al repo como archivos
sueltos, pero esos archivos estaban pensados para **pegar dentro** de tus
actions (donde el `import { createClient }` ya existe). Al quedar sueltos, no
tenían el import y el build falló con:

```
Type error: Cannot find name 'createClient'.
```

## Solución (este paquete)

Reemplazamos esos snippets por **dos archivos autónomos y válidos**, que ahora
viven en `lib/api/` y traen su propio import y la directiva `"use server"`.

### Paso 1 — Borrá la carpeta vieja

En GitHub, borrá **toda la carpeta `snippets/`** del repo. Ya no se usa.

### Paso 2 — Subí los dos archivos nuevos

```
lib/api/sugerir-codigo-riesgo.ts
lib/api/sugerir-codigo-indicador.ts
```

Son archivos completos, listos para subir tal cual. Ya pasaron chequeo de tipos.

### Paso 3 — Ajustá los imports en los componentes

Si en `GestionRiesgos.tsx` / `GestionIndicadores.tsx` ya habías importado las
funciones desde la action (como decía el instructivo anterior), cambiá el origen
del import a la nueva ubicación:

**En `components/riesgos/GestionRiesgos.tsx`:**

```diff
-import { sugerirCodigoRiesgo } from "@/app/(app)/riesgos/actions";
+import { sugerirCodigoRiesgo } from "@/lib/api/sugerir-codigo-riesgo";
```

**En `components/indicadores/GestionIndicadores.tsx`:**

```diff
-import { sugerirCodigoIndicador } from "@/app/(app)/indicadores/actions";
+import { sugerirCodigoIndicador } from "@/lib/api/sugerir-codigo-indicador";
```

Si todavía **no** habías tocado los componentes (porque el build se cortó
antes), simplemente usá el import de la derecha cuando los integres, siguiendo
los §6.2 y §7.2 del instructivo original.

> Nota: NO pongas las funciones de sugerencia adentro de las actions Y también
> como archivo suelto. Elegí un solo lugar. Con estos dos archivos en `lib/api/`,
> dejá las actions como estaban (sin las funciones de sugerencia).

## Verificación

Después de subir:
- [ ] La carpeta `snippets/` ya no existe en el repo.
- [ ] Existen `lib/api/sugerir-codigo-riesgo.ts` y
      `lib/api/sugerir-codigo-indicador.ts`.
- [ ] Los componentes (si ya los tocaste) importan desde `@/lib/api/...`.
- [ ] Build de Vercel en verde.
