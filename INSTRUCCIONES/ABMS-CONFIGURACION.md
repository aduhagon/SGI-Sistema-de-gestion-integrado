# ABMs de configuración — confirmación de eliminado

Cablea `ConfirmarEliminacion` (con motivo obligatorio) en los ABMs de
configuración. El patrón es uniforme; abajo va el diff **con la variable de fila
correcta de cada componente**, así no tenés que adaptar nada.

Requisito previo: que ya tengas subido `components/ui/ConfirmarEliminacion.tsx`
(del primer paquete). Si no, subílo primero.

---

## Patrón general (vale para todos)

En cada componente `GestionXxx.tsx` el cambio son **5 ediciones**:

1. **Import** del diálogo.
2. **Estado**: cambiar `eliminando` por `aEliminar` (guarda el item, no el id).
3. **Borrar** la función `quitar(...)`.
4. **Botón de tacho**: en vez de `quitar(item.id)`, hace `setAEliminar(item)`.
5. **Montar** `<ConfirmarEliminacion ... />` antes del cierre del return.

Y en cada `actions.ts`, **2 ediciones** en la función `eliminar*`:

- Firma: agregar `, motivo?: string`.
- Línea `eliminado_motivo`: anteponer el motivo del usuario con fallback.

El cambio en la action **no necesita** que cambies el texto fijo actual: lo
respeta como fallback.

```diff
-export async function eliminarXxx(id: string): Promise<EstadoConfig> {
+export async function eliminarXxx(id: string, motivo?: string): Promise<EstadoConfig> {
```
```diff
-      eliminado_motivo: "<EL TEXTO FIJO QUE YA TENGAS>",
+      eliminado_motivo: (motivo ?? "").trim() || "<EL TEXTO FIJO QUE YA TENGAS>",
```

---

## 1. Tipos documentales

**`app/(app)/configuracion/tipos/actions.ts`** → aplicar el cambio de action a
`eliminarTipoDocumental`.

**`components/configuracion/GestionTiposDocumentales.tsx`** (variable de fila: `t`):

```diff
 import { guardarTipoDocumental, eliminarTipoDocumental, type EstadoConfig } from "@/app/(app)/configuracion/tipos/actions";
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```
```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<TipoDocumental | null>(null);
```
```diff
-  async function quitar(id: string) {
-    setEliminando(id);
-    const r = await eliminarTipoDocumental(id);
-    setEliminando(null);
-    if (r?.ok) router.refresh();
-  }
```
Botón de tacho (en la fila `t`):
```diff
-                      <button onClick={() => quitar(t.id)} disabled={eliminando === t.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                        {eliminando === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                      </button>
+                      <button onClick={() => setAEliminar(t)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                        <Trash2 className="h-3.5 w-3.5" />
+                      </button>
```
Montar el diálogo antes del último `</div>` del return:
```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar tipo documental"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarTipoDocumental(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

---

## 2. Procesos

**`app/(app)/configuracion/procesos/actions.ts`** → cambio de action a
`eliminarProceso`.

**`components/configuracion/GestionProcesos.tsx`** (variable de fila: `p`,
tipo `ProcesoCatalogo`):

```diff
 import { guardarProceso, eliminarProceso, type EstadoConfig } from "@/app/(app)/configuracion/procesos/actions";
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```
```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<ProcesoCatalogo | null>(null);
```
Borrar la función `quitar` (idéntica al §1 pero con `eliminarProceso`).

Botón de tacho (fila `p`):
```diff
-                              <button onClick={() => quitar(p.id)} disabled={eliminando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                                {eliminando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                              </button>
+                              <button onClick={() => setAEliminar(p)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                                <Trash2 className="h-3.5 w-3.5" />
+                              </button>
```
Diálogo:
```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar proceso"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarProceso(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

---

## 3. Normas

**`app/(app)/configuracion/normas/actions.ts`** → cambio de action a
`eliminarNorma`.

**`components/configuracion/GestionNormas.tsx`** (verificá la variable de fila;
probablemente `n`):

```diff
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```
```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<Norma | null>(null);
```
Borrar `quitar`. Botón de tacho: `onClick={() => setAEliminar(n)}` (reemplazá
`n` por la variable real de la fila si difiere). Diálogo:
```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar norma"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarNorma(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

> El tipo `Norma` y el campo de nombre (`nombre` vs `nombreCorto`) puede variar;
> ajustá según tu `lib/api/configuracion`. Si el campo no es `nombre`, cambiá la
> línea `nombre={...}`.

---

## 4. Áreas

**`app/(app)/configuracion/areas/actions.ts`** → cambio de action a
`eliminarArea`.

**`components/configuracion/GestionAreas.tsx`** (variable de fila: `a`. Este
componente usa `abrirEdicion(a)` en vez de inline para editar, pero el botón de
eliminar sigue el patrón):

```diff
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```
```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<Area | null>(null);
```
Borrar `quitar`. Botón de tacho (fila `a`):
```diff
-                      <button onClick={() => quitar(a.id)} disabled={eliminando === a.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                        {eliminando === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                      </button>
+                      <button onClick={() => setAEliminar(a)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                        <Trash2 className="h-3.5 w-3.5" />
+                      </button>
```
Diálogo:
```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar área"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarArea(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

> Cuidado con el nombre del tipo: si en `lib/api/configuracion` el tipo del área
> se llama distinto (ej. `AreaCatalogo`), usá ese en el `useState`.

---

## 5. Puestos

**`app/(app)/configuracion/puestos/actions.ts`** → cambio de action a
`eliminarPuesto`.

**`components/configuracion/GestionPuestos.tsx`** (variable de fila: `p`):

```diff
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```
```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<Puesto | null>(null);
```
Borrar `quitar`. Botón de tacho (fila `p`):
```diff
-                      <button onClick={() => quitar(p.id)} disabled={eliminando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                        {eliminando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                      </button>
+                      <button onClick={() => setAEliminar(p)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                        <Trash2 className="h-3.5 w-3.5" />
+                      </button>
```
Diálogo:
```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar puesto"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarPuesto(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

> Importante: el botón de eliminar puesto convive con un `<Link>` a
> `/configuracion/puestos/[id]`. No toques el Link; solo el botón de tacho.

---

## Extra (opcional, mismo patrón) — Sedes y Versiones de norma

Detecté dos ABMs más con el mismo patrón. Si querés cerrarlos también:

### Sedes — `components/configuracion/GestionSedes.tsx` (variable `s`)
Igual que los anteriores, con `eliminarSede` y tipo `Sede`. Botón:
`onClick={() => setAEliminar(s)}`.

### Versiones de norma — `components/configuracion/GestionVersionesNorma.tsx` (variable `v`)
**Ojo, este es distinto**: `eliminarVersionNorma` recibe **dos** argumentos
`(id, normaId)`. La action ya tiene el `normaId`; el cambio de motivo va como
**tercer** parámetro:

```diff
-export async function eliminarVersionNorma(id: string, normaId: string): Promise<EstadoConfig> {
+export async function eliminarVersionNorma(id: string, normaId: string, motivo?: string): Promise<EstadoConfig> {
```
Y en el componente:
```tsx
onConfirmar={async (motivo) => {
  const r = await eliminarVersionNorma(aEliminar!.id, normaId, motivo);
  if (r?.ok) { setAEliminar(null); router.refresh(); }
  return r;
}}
```

---

## NO tocar: RolesPuesto

`components/configuracion/RolesPuesto.tsx` tiene un `quitar` con ícono `X`, pero
eso **quita un rol de un proceso** (cierra vigencia), no es un soft-delete de
catálogo. No le pongas `ConfirmarEliminacion` salvo que quieras pedir motivo ahí
también — es otro flujo. Lo dejo fuera.

---

## Checklist

- [ ] Subido `ConfirmarEliminacion.tsx` (del primer paquete).
- [ ] Tipos: action + componente.
- [ ] Procesos: action + componente.
- [ ] Normas: action + componente.
- [ ] Áreas: action + componente.
- [ ] Puestos: action + componente.
- [ ] (Opcional) Sedes, Versiones de norma.
- [ ] Build verde tras cada bloque.
- [ ] Probar: eliminar un ítem abre el diálogo y exige motivo; el motivo aparece
      en `eliminado_motivo`.
```
