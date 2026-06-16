# Paquete frontend SGI — Instructivo de integración

Este paquete trae **archivos nuevos completos** (listos para subir tal cual) y
**cambios quirúrgicos** sobre archivos que ya existen en el repo (descriptos como
"buscá esto / reemplazá por esto"). Los cambios quirúrgicos están pensados así a
propósito: tocan solo lo necesario y no pisan nada de tu código actual que
funcione.

Orden sugerido para subir por la web UI de GitHub, de menor a mayor riesgo.

---

## RESUMEN DE LO QUE INCLUYE

**Archivos nuevos (subir completos):**
1. `components/ui/ConfirmarEliminacion.tsx` — diálogo de confirmación con motivo.
2. `components/layout/SidebarNav.tsx` — navegación del sidebar filtrada por rol.
3. `lib/api/perfil-menu.ts` — helper server que llama a `fn_perfil_menu_usuario`.

**Cambios quirúrgicos (editar a mano en GitHub):**
4. Campana de notificaciones — ícono para `documento_rechazado`.
5. Sidebar — pasar a navegación por rol.
6. Módulo riesgos — código sugerido + confirmación de eliminado.
7. Módulo indicadores — código sugerido + confirmación de eliminado.
8. ABMs de configuración (tipos, procesos, normas, áreas, puestos) —
   confirmación de eliminado (patrón uniforme).
9. Retoques de lenguaje llano.

---

## 4. CAMPANA — ícono para `documento_rechazado`

**Archivo:** `components/layout/CampanaNotificaciones.tsx`

**4.1** En el import de lucide, agregá `FileX` a la lista existente:

```diff
-import { Bell, Check, CheckCheck, FileText, ClipboardCheck, AlertTriangle, Calendar, Info, Loader2 } from "lucide-react";
+import { Bell, Check, CheckCheck, FileText, FileX, ClipboardCheck, AlertTriangle, Calendar, Info, Loader2 } from "lucide-react";
```

**4.2** En el objeto `ICONO_POR_TIPO`, agregá una línea para el tipo rechazado.
Ubicala junto a los otros `documento_*`:

```diff
   documento_aprobado: FileText,
   documento_modificado: FileText,
   documento_obsoleto: FileText,
+  documento_rechazado: FileX,
```

Nada más. El componente ya hace `ICONO_POR_TIPO[n.tipo] ?? Info`, así que con
registrar la clave alcanza. (El valor `documento_rechazado` ya existe en el enum
`notificacion_tipo_enum` de la base, verificado.)

---

## 5. SIDEBAR — navegación por rol

El sidebar actual (`components/layout/Sidebar.tsx`) hardcodea todos los ítems y
los muestra a todo el mundo. Lo pasamos a filtrado por rol usando los flags que
devuelve `fn_perfil_menu_usuario()`:
`{ roles[], es_gestor, es_aprobador, es_elaborador }`.

### 5.1 Archivo nuevo: `lib/api/perfil-menu.ts`

Subí el archivo incluido en el paquete (ver `lib/api/perfil-menu.ts`). Expone:

```ts
export type PerfilMenu = {
  roles: string[];
  esGestor: boolean;
  esAprobador: boolean;
  esElaborador: boolean;
};
export async function obtenerPerfilMenu(): Promise<PerfilMenu> { ... }
```

### 5.2 Archivo nuevo: `components/layout/SidebarNav.tsx`

Subí el archivo incluido. Es el client component que recibe el perfil por props
y filtra los ítems. Reemplaza la lógica de render del `Sidebar` actual, pero
**no borres `Sidebar.tsx` todavía** — ver el paso 5.3.

### 5.3 Editar `components/layout/Sidebar.tsx`

Convertilo en un Server Component que obtiene el perfil y se lo pasa a
`SidebarNav`. Reemplazá **todo el contenido** del archivo por:

```tsx
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { SidebarNav } from "@/components/layout/SidebarNav";

export async function Sidebar() {
  const perfil = await obtenerPerfilMenu();
  return <SidebarNav perfil={perfil} />;
}
```

> Importante: hoy `Sidebar` es un `"use client"`. Al pasarlo a Server Component
> que hace `await`, el `app/(app)/layout.tsx` que lo usa ya es async y server, así
> que no hay que tocar el layout. Pero verificá que en `Sidebar.tsx` **no quede**
> la directiva `"use client"` arriba — tiene que ser un Server Component.

### 5.4 Criterio de visibilidad aplicado

`SidebarNav` ya trae esta lógica (la podés ajustar editando el archivo):

| Sección / ítem | Se muestra si |
|---|---|
| Dashboard, Procesos, Documentos | siempre |
| Aprobaciones | `esAprobador` o `esGestor` |
| Acuses | siempre |
| Cumplimiento, Riesgos, Indicadores | `esGestor` (o ajustá a gusto) |
| Auditorías, No conformidades | `esGestor` |
| Configuración | `esGestor` |

---

## 6. MÓDULO RIESGOS

**Archivos:** `components/riesgos/GestionRiesgos.tsx` y
`app/(app)/riesgos/actions.ts`.

### 6.1 Action: que `eliminarRiesgo` reciba motivo

En `app/(app)/riesgos/actions.ts`, buscá la firma actual de `eliminarRiesgo`.
Hoy es algo como:

```ts
export async function eliminarRiesgo(id: string): Promise<EstadoRiesgo> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("riesgos")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      eliminado_motivo: "Eliminado desde el módulo de riesgos",   // ← texto fijo
    })
    .eq("id", id);
  ...
```

**Cambio (2 ediciones):**

(a) Firma — agregá el parámetro opcional `motivo`:

```diff
-export async function eliminarRiesgo(id: string): Promise<EstadoRiesgo> {
+export async function eliminarRiesgo(id: string, motivo?: string): Promise<EstadoRiesgo> {
```

(b) Línea del motivo — usá el motivo del usuario con fallback:

```diff
-      eliminado_motivo: "Eliminado desde el módulo de riesgos",
+      eliminado_motivo: (motivo ?? "").trim() || "Eliminado desde el módulo de riesgos",
```

> No toques el resto de la función ni `traducir`. El fallback mantiene
> compatibilidad: si alguna llamada vieja no pasa motivo, sigue funcionando.

### 6.2 Componente: código sugerido al elegir proceso/categoría

En `components/riesgos/GestionRiesgos.tsx`:

(a) Import del helper de sugerencia (agregalo a los imports de acciones):

```diff
 import { guardarRiesgo, eliminarRiesgo, type EstadoRiesgo } from "@/app/(app)/riesgos/actions";
+import { sugerirCodigoRiesgo } from "@/app/(app)/riesgos/actions";
```

> El helper `sugerirCodigoRiesgo` va en la action de riesgos — ver el snippet
> listo para pegar en `snippets/sugerir-codigo-riesgo.ts` de este paquete.

(b) Pasá el campo `codigo` a controlado. Cerca de los otros `useState` del
componente, agregá:

```tsx
const [codigo, setCodigo] = useState("");
const [sugiriendo, setSugiriendo] = useState(false);
```

(c) En `abrir(r)`, inicializá el código con el del riesgo que se edita (o vacío
en alta):

```diff
   function abrir(r: Riesgo | null) {
     setEditando(r);
+    setCodigo(r ? r.codigo : "");
     setProb(r ? r.probabilidad : 3);
     setImp(r ? r.impacto : 3);
     setAbierto(true);
   }
```

(d) En el `<input id="codigo">`, pasalo de no controlado a controlado:

```diff
-                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""} placeholder="R-COM-01"
-                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
+                    <input id="codigo" name="codigo" required value={codigo} placeholder="R-COM-01"
+                      onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                       className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
```

(e) En el `<select id="procesoId">` y en el `<select id="categoria">`, agregá un
`onChange` que pida la sugerencia **solo si el código está vacío** (no pisar lo
que el usuario escribió ni el código en edición):

```tsx
// Función a agregar dentro del componente:
async function pedirSugerencia(procesoId: string, categoria: string) {
  if (!procesoId || codigo.trim() !== "") return; // no pisar lo ya escrito
  setSugiriendo(true);
  const sug = await sugerirCodigoRiesgo(procesoId, categoria);
  setSugiriendo(false);
  if (sug) setCodigo(sug);
}
```

En el select de proceso:

```diff
-                    <select id="procesoId" name="procesoId" required defaultValue={editando?.procesoId ?? ""} className="...">
+                    <select id="procesoId" name="procesoId" required defaultValue={editando?.procesoId ?? ""}
+                      onChange={(e) => pedirSugerencia(e.target.value, (document.getElementById("categoria") as HTMLSelectElement)?.value ?? "riesgo")}
+                      className="...">
```

> Opcional: si querés que cambiar la categoría también resugiera, agregá el
> mismo `onChange` al `<select id="categoria">` leyendo el proceso elegido.

### 6.3 Componente: confirmación de eliminado

Reemplazá el borrado directo por el diálogo `ConfirmarEliminacion`.

(a) Imports:

```diff
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```

(b) Estado — reemplazá `eliminando` por un estado del riesgo a eliminar:

```diff
-  const [eliminando, setEliminando] = useState<string | null>(null);
+  const [aEliminar, setAEliminar] = useState<Riesgo | null>(null);
```

(c) Reemplazá la función `quitar` por nada (la borrás) y en su lugar el botón de
tacho abre el diálogo. Buscá el botón de eliminar en la fila de la tabla:

```diff
-                      <button onClick={() => quitar(r.id)} disabled={eliminando === r.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
-                        {eliminando === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
-                      </button>
+                      <button onClick={() => setAEliminar(r)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Eliminar" aria-label="Eliminar">
+                        <Trash2 className="h-3.5 w-3.5" />
+                      </button>
```

(d) Borrá la función `quitar` entera (ya no se usa):

```diff
-  async function quitar(id: string) {
-    setEliminando(id);
-    const r = await eliminarRiesgo(id);
-    setEliminando(null);
-    if (r?.ok) router.refresh();
-  }
```

(e) Antes del cierre del componente (antes del último `</div>` del return),
montá el diálogo:

```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar riesgo"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.titulo}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarRiesgo(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

---

## 7. MÓDULO INDICADORES

Idéntico a riesgos, con dos diferencias: el helper es `sugerirCodigoIndicador`
(toma solo `procesoId`, sin categoría) y los nombres son de indicador.

### 7.1 Action `eliminarIndicador` — agregar motivo

En `app/(app)/indicadores/actions.ts`, mismo cambio que 6.1:

```diff
-export async function eliminarIndicador(id: string): Promise<EstadoIndicador> {
+export async function eliminarIndicador(id: string, motivo?: string): Promise<EstadoIndicador> {
```

```diff
-      eliminado_motivo: "Eliminado desde el módulo de indicadores",
+      eliminado_motivo: (motivo ?? "").trim() || "Eliminado desde el módulo de indicadores",
```

> Verificá cuál es el texto fijo actual en tu archivo y reemplazá esa línea.

### 7.2 Código sugerido

Igual que 6.2 pero:
- Helper: `sugerirCodigoIndicador(procesoId)` (sin categoría).
- El `onChange` del `<select id="procesoId">`:

```tsx
async function pedirSugerencia(procesoId: string) {
  if (!procesoId || codigo.trim() !== "") return;
  setSugiriendo(true);
  const sug = await sugerirCodigoIndicador(procesoId);
  setSugiriendo(false);
  if (sug) setCodigo(sug);
}
```

```diff
+                      onChange={(e) => pedirSugerencia(e.target.value)}
```

El campo `<input id="codigo">` (placeholder `KPI-PROD-01`) se pasa a controlado
igual que en riesgos.

### 7.3 Confirmación de eliminado

Igual que 6.3, con `Indicador` en vez de `Riesgo`, `setAEliminar`, y:

```tsx
<ConfirmarEliminacion
  abierto={aEliminar !== null}
  titulo="Eliminar indicador"
  nombre={aEliminar ? `${aEliminar.codigo} · ${aEliminar.nombre}` : null}
  onCancelar={() => setAEliminar(null)}
  onConfirmar={async (motivo) => {
    const r = await eliminarIndicador(aEliminar!.id, motivo);
    if (r?.ok) { setAEliminar(null); router.refresh(); }
    return r;
  }}
/>
```

---

## 8. ABMs DE CONFIGURACIÓN (patrón uniforme)

Aplica a los cinco que comparten exactamente la misma estructura:

- `components/configuracion/GestionTiposDocumentales.tsx` + `tipos/actions.ts`
- `components/configuracion/GestionProcesos.tsx` + `procesos/actions.ts`
- `components/configuracion/GestionNormas.tsx` + `normas/actions.ts`
- `components/configuracion/GestionAreas.tsx` + `areas/actions.ts`
- `components/configuracion/GestionPuestos.tsx` + `puestos/actions.ts`

> Nota: estos ABMs **no** llevan código sugerido (eso es solo riesgos e
> indicadores). Solo confirmación de eliminado.

### 8.1 En cada `*/actions.ts` — agregar motivo a la función `eliminar*`

Patrón a buscar (el nombre de la función y el texto fijo varían por entidad):

```ts
export async function eliminarXxx(id: string): Promise<EstadoConfig> {
  ...
      eliminado_motivo: "Eliminado desde configuración",   // ← texto fijo
  ...
}
```

Cambio:

```diff
-export async function eliminarXxx(id: string): Promise<EstadoConfig> {
+export async function eliminarXxx(id: string, motivo?: string): Promise<EstadoConfig> {
```

```diff
-      eliminado_motivo: "Eliminado desde configuración",
+      eliminado_motivo: (motivo ?? "").trim() || "Eliminado desde configuración",
```

### 8.2 En cada componente `GestionXxx.tsx` — confirmación

Mismo diff que 6.3, adaptando el tipo y el `eliminar*`. El patrón es idéntico en
los cinco:

1. `import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";`
2. Reemplazar `const [eliminando, setEliminando] = useState<string | null>(null);`
   por `const [aEliminar, setAEliminar] = useState<Xxx | null>(null);`
3. Borrar la función `quitar(id)`.
4. El botón de tacho: `onClick={() => setAEliminar(item)}` (sin `disabled` ni
   spinner; el spinner ahora vive dentro del diálogo).
5. Montar `<ConfirmarEliminacion ... />` antes del cierre del return, con:
   ```tsx
   onConfirmar={async (motivo) => {
     const r = await eliminarXxx(aEliminar!.id, motivo);
     if (r?.ok) { setAEliminar(null); router.refresh(); }
     return r;
   }}
   ```

> Si algún componente usa otro nombre de variable para el item de la fila (ej.
> `t`, `p`, `a`), respetá ese nombre en `setAEliminar(t)`.

### 8.3 Caso especial: persona-puesto

`puestos/[id]/persona-actions.ts` usa `motivo_revocacion` (no `eliminado_motivo`)
porque cierra una vigencia SCD2, no hace soft-delete. Si querés que también pida
motivo al usuario, el cambio es análogo pero sobre `motivo_revocacion`. Lo dejo
**fuera** de este paquete salvo que me confirmes, porque toca el flujo de
revocación de participaciones (RPC) y conviene tratarlo aparte.

---

## 9. RETOQUES DE LENGUAJE LLANO

Cambios de texto, sin lógica. Los listo como sugerencia; aplicá los que te
cierren:

- En `ConfirmarEliminacion` (ya incluido): el texto explica que el registro
  "queda guardado en el historial" en lugar de jerga de soft-delete.
- Empty states: ya están en lenguaje llano en los componentes actuales.
- Sugerencia general: donde diga "elaborador/aprobador N1/N2", para usuarios
  finales podés mostrar "quién redacta / quién aprueba". Esto es opcional y no
  lo toqué para no alterar términos que quizás usás en auditoría.

> Si tenés una lista puntual de frases a cambiar, pasámela y la dejo como diffs
> exactos.

---

## CHECKLIST DE VERIFICACIÓN POST-DEPLOY

- [ ] La campana muestra un ícono distinto para notificaciones de tipo
      `documento_rechazado`.
- [ ] El sidebar oculta Configuración/Auditorías a un usuario sin rol de gestor.
- [ ] Al crear un riesgo, elegir proceso prellena el código (si estaba vacío).
- [ ] Al crear un indicador, elegir proceso prellena el código.
- [ ] Eliminar cualquier ítem abre el diálogo y exige motivo.
- [ ] El motivo escrito aparece en la columna `eliminado_motivo` de la fila.
- [ ] Build de Vercel en verde.
