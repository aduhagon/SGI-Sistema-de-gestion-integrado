# NC — mostrar el requisito incumplido en el detalle (solo lectura)

Complementa la mejora anterior: ahora que la NC guarda `requisito_id`, lo
mostramos en la pantalla de detalle. Es un cambio de **solo lectura**, sin
riesgo de escritura.

Dos archivos:
- `lib/api/ncs.ts` — sumar el requisito al SELECT y al tipo `NCDetalle`.
- `app/(app)/ncs/[id]/page.tsx` — mostrarlo en el encabezado.

---

## 1. `lib/api/ncs.ts`

### 1.1 Ampliar el tipo `NCDetalle`

Agregá un campo opcional para el requisito:

```diff
 export type NCDetalle = NCLista & {
   descripcion: string;
   origenDescripcion: string | null;
   analisisCausaRaiz: string | null;
   metodoAnalisis: string | null;
   requiereAccionInmediata: boolean;
   accionInmediataDescripcion: string | null;
   hallazgoCodigo: string | null;
+  requisito: {
+    normaCodigo: string;
+    clausula: string;
+    titulo: string;
+  } | null;
 };
```

### 1.2 Sumar el join al SELECT de `obtenerNCDetalle`

En la llamada `.select(...)` de `obtenerNCDetalle`, agregá el join del requisito
(sigue el mismo patrón de FK explícita que ya usás para hallazgos):

```diff
     .select(
       `${SELECT_LISTA}, descripcion, origen_descripcion, analisis_causa_raiz,
        metodo_analisis, requiere_accion_inmediata, accion_inmediata_descripcion,
-       hallazgos:hallazgos!no_conformidades_hallazgo_id_fkey (codigo)`,
+       hallazgos:hallazgos!no_conformidades_hallazgo_id_fkey (codigo),
+       requisitos:requisitos!no_conformidades_requisito_id_fkey (
+         clausula, titulo,
+         versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
+           normas:normas!versiones_norma_norma_id_fkey (codigo)
+         )
+       )`,
     )
```

### 1.3 Mapear el resultado

En el `return { ... }` de `obtenerNCDetalle`, agregá el mapeo del requisito:

```diff
     requiereAccionInmediata: n.requiere_accion_inmediata,
     accionInmediataDescripcion: n.accion_inmediata_descripcion,
     hallazgoCodigo: n.hallazgos?.codigo ?? null,
+    requisito: n.requisitos
+      ? {
+          normaCodigo: n.requisitos.versiones_norma?.normas?.codigo ?? "—",
+          clausula: n.requisitos.clausula,
+          titulo: n.requisitos.titulo,
+        }
+      : null,
   };
```

> Nombres de FK verificados contra tu base: `no_conformidades_requisito_id_fkey`,
> `requisitos_version_norma_id_fkey` y `versiones_norma_norma_id_fkey` existen
> tal cual. El join de PostgREST funciona con estos nombres sin ajustes.

---

## 2. `app/(app)/ncs/[id]/page.tsx`

Mostramos el requisito en la línea de metadatos del encabezado, junto a origen,
hallazgo y proceso. Buscá ese bloque (la línea con los separadores `·`) y
agregá el requisito. Conviene ponerlo después del hallazgo:

```diff
           <span>{ORIGEN[nc.origen] ?? nc.origen}</span>
           {nc.hallazgoCodigo && (<><span className="text-muted-foreground/40">·</span><span className="font-mono text-xs">Hallazgo {nc.hallazgoCodigo}</span></>)}
+          {nc.requisito && (
+            <>
+              <span className="text-muted-foreground/40">·</span>
+              <span className="flex items-center gap-1">
+                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
+                {nc.requisito.normaCodigo} {nc.requisito.clausula}
+              </span>
+            </>
+          )}
           {nc.procesoNombre && (<><span className="text-muted-foreground/40">·</span><span className="flex items-center gap-1"><Network className="h-3.5 w-3.5" aria-hidden="true" />{nc.procesoNombre}</span></>)}
```

Y agregá `ClipboardCheck` al import de lucide:

```diff
-import { ChevronLeft, CheckCircle2, Calendar, Network, AlertTriangle, Microscope } from "lucide-react";
+import { ChevronLeft, CheckCircle2, Calendar, Network, AlertTriangle, Microscope, ClipboardCheck } from "lucide-react";
```

### Opcional: mostrar el título completo del requisito en una sección

Si querés que se vea no solo "ISO9001 8.4" sino también el título del requisito,
agregá una sección breve después de la Descripción:

```tsx
{nc.requisito && (
  <section className="mb-8">
    <h2 className="mb-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
      Requisito incumplido
    </h2>
    <p className="text-sm leading-relaxed text-foreground">
      <span className="font-mono text-xs text-muted-foreground">
        {nc.requisito.normaCodigo} · {nc.requisito.clausula}
      </span>
      <br />
      {nc.requisito.titulo}
    </p>
  </section>
)}
```

---

## Checklist

- [ ] `lib/api/ncs.ts`: tipo `NCDetalle` con `requisito`, join en el SELECT,
      mapeo en el return.
- [ ] `app/(app)/ncs/[id]/page.tsx`: import `ClipboardCheck` + mostrar el
      requisito en el encabezado (y opcional, la sección con el título).
- [ ] Build verde.
- [ ] Probar: abrir una NC que tenga requisito → se ve "ISO9001 8.4" en el
      encabezado.

> Recordá que las NC viejas (creadas antes de la mejora) no tienen
> `requisito_id`, así que en esas el campo no se muestra (queda null). Es el
> comportamiento esperado.
```
