# Coberturas y Versiones de norma — confirmación de eliminado

Cablea `ConfirmarEliminacion` en los dos ABMs que faltaban. Ambos tienen una
particularidad respecto a los ABMs de configuración estándar, así que el diff va
detallado para cada uno.

Requisito previo: tener subido `components/ui/ConfirmarEliminacion.tsx`.

---

## 1. COBERTURAS (desvincular requisito de un documento)

**Archivos:**
- `components/coberturas/GestionCoberturas.tsx` (variable de fila: `c`,
  tipo `CoberturaActual`)
- `app/(app)/documentos/[id]/cobertura-actions.ts` → función `eliminarCobertura`

### Particularidades

- El botón no dice "Eliminar" sino **"Desvincular requisito"** (ícono `X`, no
  `Trash2`). Mantenemos esa semántica.
- `eliminarCobertura` recibe **dos** argumentos: `(documentoId, coberturaId)`.
  El motivo va como **tercer** parámetro.
- Como "desvincular" es una acción más liviana que borrar un catálogo, te
  propongo el motivo **opcional** acá (`motivoRequerido={false}`). Si preferís
  exigirlo por trazabilidad de la matriz de cumplimiento, sacá esa prop.

### 1.1 Action — `cobertura-actions.ts`

```diff
-export async function eliminarCobertura(
-  documentoId: string,
-  coberturaId: string,
-): Promise<EstadoCobertura> {
+export async function eliminarCobertura(
+  documentoId: string,
+  coberturaId: string,
+  motivo?: string,
+): Promise<EstadoCobertura> {
```

```diff
-      eliminado_motivo: "Desvinculado desde el detalle del documento",
+      eliminado_motivo: (motivo ?? "").trim() || "Desvinculado desde el detalle del documento",
```

### 1.2 Componente — `GestionCoberturas.tsx`

(a) Import:

```diff
 import { eliminarCobertura } from "@/app/(app)/documentos/[id]/cobertura-actions";
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```

(b) Estado — reemplazar `eliminando` por el item a desvincular:

```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aDesvincular, setADesvincular] = useState<CoberturaActual | null>(null);
```

(c) Borrar la función `quitar`:

```diff
-  async function quitar(coberturaId: string) {
-    setEliminando(coberturaId);
-    const r = await eliminarCobertura(documentoId, coberturaId);
-    setEliminando(null);
-    if (r?.ok) router.refresh();
-  }
```

(d) Botón (fila `c`):

```diff
-              <button
-                type="button"
-                onClick={() => quitar(c.coberturaId)}
-                disabled={eliminando === c.coberturaId}
-                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
-                title="Desvincular requisito"
-                aria-label="Desvincular requisito"
-              >
-                {eliminando === c.coberturaId ? (
-                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
-                ) : (
-                  <X className="h-4 w-4" aria-hidden="true" />
-                )}
-              </button>
+              <button
+                type="button"
+                onClick={() => setADesvincular(c)}
+                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
+                title="Desvincular requisito"
+                aria-label="Desvincular requisito"
+              >
+                <X className="h-4 w-4" aria-hidden="true" />
+              </button>
```

> Si después de sacar el spinner te queda sin usar el import `Loader2`,
> eliminalo del import de lucide para que no salte warning de no-usado. (`X` y
> `Link2` siguen en uso.)

(e) Montar el diálogo. Hay un `<AgregarCoberturaDialog ... />` al final del
return, justo antes de `</section>`. Poné el `ConfirmarEliminacion` al lado:

```diff
       <AgregarCoberturaDialog
         documentoId={documentoId}
         normas={normas}
         requisitosPorNorma={requisitosPorNorma}
         abierto={abierto}
         onClose={() => setAbierto(false)}
       />
+
+      <ConfirmarEliminacion
+        abierto={aDesvincular !== null}
+        titulo="Desvincular requisito"
+        nombre={aDesvincular ? `${aDesvincular.normaCodigo} ${aDesvincular.clausula} · ${aDesvincular.requisitoTitulo}` : null}
+        descripcion="El requisito deja de figurar como cubierto por este documento. Queda registrado en el historial con la fecha, el autor y el motivo."
+        motivoRequerido={false}
+        etiquetaConfirmar="Desvincular"
+        onCancelar={() => setADesvincular(null)}
+        onConfirmar={async (motivo) => {
+          const r = await eliminarCobertura(documentoId, aDesvincular!.coberturaId, motivo);
+          if (r?.ok) { setADesvincular(null); router.refresh(); }
+          return r;
+        }}
+      />
     </section>
```

---

## 2. VERSIONES DE NORMA

**Archivos:**
- `components/configuracion/GestionVersionesNorma.tsx` (variable de fila: `v`,
  tipo `VersionNorma`)
- `app/(app)/configuracion/normas/[id]/version-actions.ts` →
  función `eliminarVersionNorma`

### Particularidad

`eliminarVersionNorma` recibe **dos** argumentos `(id, normaId)`. El motivo va
como **tercero**. El componente ya tiene `normaId` en props.

### 2.1 Action — `version-actions.ts`

```diff
-export async function eliminarVersionNorma(id: string, normaId: string): Promise<EstadoNormativa> {
+export async function eliminarVersionNorma(id: string, normaId: string, motivo?: string): Promise<EstadoNormativa> {
```

```diff
-      eliminado_motivo: "Eliminada desde configuración",
+      eliminado_motivo: (motivo ?? "").trim() || "Eliminada desde configuración",
```

### 2.2 Componente — `GestionVersionesNorma.tsx`

(a) Import:

```diff
 import { guardarVersionNorma, eliminarVersionNorma, type EstadoNormativa } from "@/app/(app)/configuracion/normas/[id]/version-actions";
 import { Button } from "@/components/ui/button";
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```

(b) Estado:

```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<VersionNorma | null>(null);
```

(c) Borrar la función `quitar`:

```diff
-  async function quitar(id: string) {
-    setEliminando(id);
-    const r = await eliminarVersionNorma(id, normaId);
-    setEliminando(null);
-    if (r?.ok) router.refresh();
-  }
```

(d) Botón (fila `v`):

```diff
-                <button onClick={() => quitar(v.id)} disabled={eliminando === v.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                  {eliminando === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                </button>
+                <button onClick={() => setAEliminar(v)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                  <Trash2 className="h-3.5 w-3.5" />
+                </button>
```

(e) Montar el diálogo antes del cierre del return (antes del último `</div>`):

```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar versión de norma"
  nombre={aEliminar ? `Versión ${aEliminar.version}${aEliminar.nombreVersion ? " · " + aEliminar.nombreVersion : ""}` : null}
  descripcion="Se elimina esta versión de la norma. Si tiene requisitos cargados, revisá que no estén vinculados a documentos vigentes antes de continuar."
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarVersionNorma(aEliminar!.id, normaId, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

> Cuidado: no toques el `<Link>` "Requisitos" ni el botón de editar (lápiz) de
> cada versión. Solo el botón de tacho.

> Ojo extra con la versión actual: si borrás la versión marcada como actual, la
> norma queda sin versión vigente. El sistema no lo bloquea acá; si querés un
> chequeo ("no se puede eliminar la versión actual"), decímelo y lo agregamos en
> la action.

---

## Checklist

- [ ] Coberturas: action (3er arg motivo) + componente (diálogo con motivo
      opcional).
- [ ] Versiones de norma: action (3er arg motivo) + componente.
- [ ] Si quitaste el spinner de coberturas, revisá que `Loader2` no quede como
      import sin usar.
- [ ] Build verde.
- [ ] Probar: desvincular una cobertura abre el diálogo; eliminar una versión
      abre el diálogo y exige motivo; ambos motivos aparecen en
      `eliminado_motivo`.
```
