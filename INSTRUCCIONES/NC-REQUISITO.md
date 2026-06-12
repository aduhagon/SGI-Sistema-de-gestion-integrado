# NC — seleccionar el requisito incumplido (norma → requisito)

Permite, al abrir una no conformidad, elegir **qué requisito de qué norma** se
está incumpliendo. La base ya lo soporta: `no_conformidades.requisito_id` existe
con FK a `requisitos`. Es solo frontend.

Decisiones aplicadas: **dos selects encadenados** (norma filtra requisitos) y
**requisito obligatorio**.

## Archivos

**Nuevo (subir):**
- `components/ncs/SelectorRequisitoNC.tsx` — el selector encadenado (incluido).

**Editar:**
- `lib/schemas/nc.ts` — sumar `requisitoId` al schema.
- `app/(app)/ncs/nueva/actions.ts` — leer y guardar `requisito_id`.
- `app/(app)/ncs/nueva/page.tsx` — cargar normas + requisitos y pasarlos al form.
- `components/ncs/NCForm.tsx` — recibir los datos y montar el selector.

> Datos verificados en tu base: hoy tenés requisitos cargados en ISO 9001 (35),
> ISO 45001 (34), ISO 14001 (32) y BRCGS (10). BPA y GLOBALGAP no tienen
> requisitos todavía, así que no van a aparecer en el selector (la función ya
> filtra las normas sin requisitos). Eso es correcto.

---

## 1. Schema — `lib/schemas/nc.ts`

Agregá `requisitoId` como **obligatorio** en `crearNCSchema`. Dentro del
`z.object({ ... })`, sumá:

```diff
     origen: z.enum(ORIGENES_NC, {
       errorMap: () => ({ message: "Elegí el origen de la no conformidad." }),
     }),
+    requisitoId: z
+      .string({ required_error: "Elegí el requisito incumplido." })
+      .uuid("Elegí el requisito incumplido."),
     hallazgoId: z.string().uuid().optional().or(z.literal("")),
```

> Si en algún momento querés volverlo opcional, cambiá esa línea por:
> `requisitoId: z.string().uuid().optional().or(z.literal("")),`

---

## 2. Action — `app/(app)/ncs/nueva/actions.ts`

(a) Sumar `requisitoId` al `safeParse` (junto a los otros `formData.get`):

```diff
     origen: formData.get("origen"),
+    requisitoId: formData.get("requisitoId") || undefined,
     hallazgoId: formData.get("hallazgoId") || undefined,
```

(b) En el `.insert({ ... })` de `no_conformidades`, agregá la columna:

```diff
       origen: input.origen,
+      requisito_id: input.requisitoId,
       hallazgo_id: hallazgoId,
```

> `input.requisitoId` ya viene validado como uuid por el schema, así que va
> directo. (Si lo hubieras dejado opcional, usá:
> `requisito_id: input.requisitoId && input.requisitoId !== "" ? input.requisitoId : null,`)

---

## 3. Page — `app/(app)/ncs/nueva/page.tsx`

La page hoy carga `procesos` y `hallazgos`. Sumamos normas + requisitos por
norma, igual que hace la página de detalle de documento para coberturas.

(a) Imports nuevos arriba:

```diff
 import { obtenerProcesosParaAlcance } from "@/lib/api/auditorias";
 import { obtenerHallazgosSinNC } from "@/lib/api/ncs";
+import { obtenerNormasConRequisitos } from "@/lib/api/matriz";
+import { obtenerRequisitosDeNorma } from "@/lib/api/coberturas";
 import { NCForm } from "@/components/ncs/NCForm";
```

(b) En el cuerpo del componente, cargá las normas y armá el mapa de requisitos:

```diff
   const [procesos, hallazgos] = await Promise.all([
     obtenerProcesosParaAlcance(),
     obtenerHallazgosSinNC(),
   ]);
+
+  // Normas con requisitos + requisitos por norma, para el selector encadenado.
+  const normasConReq = await obtenerNormasConRequisitos();
+  const requisitosPorNorma: Record<
+    string,
+    Awaited<ReturnType<typeof obtenerRequisitosDeNorma>>
+  > = {};
+  for (const n of normasConReq) {
+    requisitosPorNorma[n.versionNormaId] = await obtenerRequisitosDeNorma(
+      n.versionNormaId,
+    );
+  }
```

(c) Pasá los nuevos props al form:

```diff
-      <NCForm procesos={procesos} hallazgos={hallazgos} />
+      <NCForm
+        procesos={procesos}
+        hallazgos={hallazgos}
+        normas={normasConReq}
+        requisitosPorNorma={requisitosPorNorma}
+      />
```

---

## 4. Form — `components/ncs/NCForm.tsx`

(a) Import del selector y de los tipos (arriba del archivo):

```diff
+import { SelectorRequisitoNC } from "@/components/ncs/SelectorRequisitoNC";
+import type { NormaOpcionNC, RequisitoOpcionNC } from "@/components/ncs/SelectorRequisitoNC";
```

(b) Ampliá las props del componente. Buscá la firma de `NCForm` (algo como
`export function NCForm({ procesos, hallazgos }: Props)`) y agregá los dos
nuevos campos al tipo `Props` y a la desestructuración:

```diff
 type Props = {
   procesos: ...;
   hallazgos: ...;
+  normas: NormaOpcionNC[];
+  requisitosPorNorma: Record<string, RequisitoOpcionNC[]>;
 };
```
```diff
-export function NCForm({ procesos, hallazgos }: Props) {
+export function NCForm({ procesos, hallazgos, normas, requisitosPorNorma }: Props) {
```

> Si las props están tipadas inline (sin un `type Props` separado), agregá los
> dos campos donde corresponda con la misma forma.

(c) Montá el selector dentro del `<form>`, en un lugar lógico: justo **después**
del bloque de Tipo / Severidad / Origen y **antes** (o después) del bloque de
hallazgo. Pegá:

```tsx
<SelectorRequisitoNC normas={normas} requisitosPorNorma={requisitosPorNorma} />
```

Queda natural ubicarlo cerca del origen, porque "qué requisito incumple" es
parte de encuadrar la NC. Ejemplo de ubicación:

```diff
       </div>   {/* cierre del grid Tipo/Severidad/Origen */}

+      <SelectorRequisitoNC normas={normas} requisitosPorNorma={requisitosPorNorma} />
+
       {esAuditoria && (
         <div className="space-y-2">
           <label htmlFor="hallazgoId" ...>
```

---

## Cómo se comporta

- Primer select: solo las normas que tienen requisitos cargados (hoy: ISO 9001,
  ISO 45001, ISO 14001, BRCGS).
- Al elegir una norma, el segundo select se puebla con sus requisitos, ordenados
  por cláusula (4, 4.1, 4.2, 5, …).
- El segundo select es `required`: no se puede crear la NC sin requisito.
- Solo se envía `requisitoId`. La norma se deduce del requisito (un requisito
  pertenece a una única versión de norma), así que no hace falta guardarla
  aparte.

---

## Mostrar el requisito en el detalle de la NC (opcional, recomendado)

Hoy `lib/api/ncs.ts` (`obtenerNCDetalle`) no trae el requisito. Si querés verlo
en la pantalla de detalle de la NC, sumá al SELECT de `obtenerNCDetalle` el join:

```
requisitos:requisitos!no_conformidades_requisito_id_fkey (
  clausula, titulo,
  versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
    normas:normas!versiones_norma_norma_id_fkey (codigo)
  )
)
```

…y mapealo a un campo nuevo del tipo `NCDetalle` (ej. `requisito: { norma, clausula, titulo }`)
para mostrarlo en `app/(app)/ncs/[id]/page.tsx`. Si querés, te lo armo como
diff aparte: decímelo y lo agrego (es un cambio de solo lectura, sin riesgo).

---

## Checklist

- [ ] Subido `components/ncs/SelectorRequisitoNC.tsx`.
- [ ] Schema: `requisitoId` obligatorio.
- [ ] Action: leer `requisitoId` + `requisito_id` en el insert.
- [ ] Page: cargar normas + requisitosPorNorma y pasarlos al form.
- [ ] Form: props nuevas + `<SelectorRequisitoNC />` montado.
- [ ] Build verde.
- [ ] Probar: abrir una NC exige elegir norma y requisito; el `requisito_id`
      queda guardado en la fila.
```
