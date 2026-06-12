# Persona-puesto — confirmación con motivo de revocación

Caso especial: quitar una persona de un puesto **no es un soft-delete**. Cierra
una vigencia SCD2 (`vigente_hasta` + `motivo_revocacion`) y además dispara el
RPC `fn_revocar_participaciones_de_puesto`, que revoca las participaciones que
esa persona tenía materializadas en procesos por ese puesto.

Por eso este cambio se trata aparte y conviene probarlo aislado.

**Dato importante:** el `motivo_revocacion` ya se muestra al usuario en el
historial de la persona (`HistorialPuestos.tsx` → "Baja: {motivo}"). Así que el
motivo que capture este diálogo va a quedar visible en la auditoría. Razón de
más para que lo escriba el usuario y no quede el texto fijo.

Requisito previo: tener subido `components/ui/ConfirmarEliminacion.tsx`.

**Archivos:**
- `components/configuracion/PersonasPuesto.tsx` (variable de fila: `p`,
  tipo `PersonaDePuesto`)
- `app/(app)/configuracion/puestos/[id]/persona-actions.ts` →
  función `quitarPersonaDePuesto`

---

## 1. Action — `quitarPersonaDePuesto`

La función recibe `(puestoId, personaPuestoId)`. Le agregamos el motivo del
usuario y lo usamos en **dos lugares**: el `motivo_revocacion` del vínculo y el
`p_motivo` del RPC (opción B, más coherente para auditoría).

### 1.1 Firma

```diff
 export async function quitarPersonaDePuesto(
   puestoId: string,
   personaPuestoId: string,
+  motivo?: string,
 ): Promise<EstadoPersona> {
```

### 1.2 Motivo en el cierre de la vigencia (SCD2)

```diff
   const { error } = await supabase
     .from("persona_puesto")
     .update({
       vigente_hasta: new Date().toISOString(),
-      motivo_revocacion: "Quitada del puesto desde configuración",
+      motivo_revocacion: (motivo ?? "").trim() || "Quitada del puesto desde configuración",
     })
     .eq("id", personaPuestoId);
```

### 1.3 Motivo en el RPC de revocación (opción B)

```diff
       const { data: cerradas, error: errRpc } = await supabase.rpc(
         "fn_revocar_participaciones_de_puesto",
         {
           p_usuario_id: usuario.id,
           p_puesto_id: puestoId,
-          p_motivo: "Baja de puesto",
+          p_motivo: (motivo ?? "").trim() || "Baja de puesto",
         },
       );
```

> **Si preferís la opción A** (el RPC mantiene su motivo genérico "Baja de
> puesto" y solo el vínculo lleva el motivo del usuario): no toques el bloque
> 1.3, dejalo como estaba. El 1.1 y 1.2 alcanzan.

---

## 2. Componente — `PersonasPuesto.tsx`

### 2.1 Import

```diff
+import { ConfirmarEliminacion } from "@/components/ui/ConfirmarEliminacion";
```

### 2.2 Estado

Reemplazá el estado `quitando` (string id) por el item a quitar:

```diff
-  const [quitando, setQuitando] = useState<string | null>(null);
+  const [aQuitar, setAQuitar] = useState<PersonaDePuesto | null>(null);
```

> Verificá el nombre exacto del estado en tu archivo. Por lo que vi es
> `quitando` / `setQuitando`. Si fuera otro, adaptá.

### 2.3 Borrar la función `quitar`

```diff
-  async function quitar(id: string) {
-    setQuitando(id);
-    const r = await quitarPersonaDePuesto(puestoId, id);
-    setQuitando(null);
-    if (r?.ok) router.refresh();
-  }
```

### 2.4 Botón (fila `p`)

```diff
-              <button type="button" onClick={() => quitar(p.id)} disabled={quitando === p.id} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" title="Quitar" aria-label="Quitar">
-                {quitando === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
-              </button>
+              <button type="button" onClick={() => setAQuitar(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Quitar" aria-label="Quitar">
+                <X className="h-4 w-4" />
+              </button>
```

> Si al sacar el spinner te queda `Loader2` sin usar en este archivo, quitalo
> del import de lucide.

### 2.5 Montar el diálogo

Antes del cierre del `</section>` (el componente devuelve un `<section>`):

```tsx
<ConfirmarEliminacion
  abierto={aQuitar !== null}
  titulo="Quitar persona del puesto"
  nombre={aQuitar ? aQuitar.personaNombre : null}
  descripcion="La persona deja de ocupar este puesto desde hoy. Se cierran sus participaciones en los procesos donde el puesto tenía rol. Queda registrado en el historial con la fecha, el autor y el motivo."
  etiquetaConfirmar="Quitar del puesto"
  onCancelar={() => setAQuitar(null)}
  onConfirmar={async (motivo) => {
    const r = await quitarPersonaDePuesto(puestoId, aQuitar!.id, motivo);
    if (r?.ok) { setAQuitar(null); router.refresh(); }
    return r;
  }}
/>
```

> **Nota sobre el `aviso`:** la action puede devolver `{ ok: true, aviso: "..." }`
> con info útil (cuántas participaciones se cerraron). Hoy el componente maneja
> `resultado.aviso` por separado para el flujo de asignar. Acá, al quitar, el
> diálogo se cierra apenas `ok` es true; el `aviso` se pierde en la UI (la
> operación igual se hace bien). Si querés mostrar ese aviso (ej: "Se cerraron 3
> participaciones"), decímelo y te paso una variante que lo muestre como toast o
> debajo de la lista. Lo dejé simple para no tocar el manejo de `resultado` que
> ya tenés para asignar.

---

## 3. Tener en cuenta (no rompe, pero conviene saber)

- **`motivoRequerido` está en true por defecto.** Para una baja de puesto tiene
  sentido exigir motivo (queda en el historial visible). Si en algún caso querés
  permitir quitar sin motivo, agregá `motivoRequerido={false}` al diálogo.
- **El flujo de "Asignar persona"** del mismo componente no se toca. Solo el
  botón de quitar.
- **El diálogo de baja de persona** (`GestionPersonas.tsx`, "Dar de baja") es
  otro flujo distinto, con su propio campo de motivo ya implementado. No lo
  toques con esto.

---

## Checklist

- [ ] Action: firma con `motivo?`, motivo en `motivo_revocacion`, y (opción B)
      en el `p_motivo` del RPC.
- [ ] Componente: import, estado `aQuitar`, borrar `quitar`, botón con
      `setAQuitar(p)`, diálogo montado.
- [ ] Si quitaste el spinner, revisá `Loader2` sin usar.
- [ ] Build verde.
- [ ] Probar: quitar una persona abre el diálogo y exige motivo; el motivo
      aparece en el historial de la persona ("Baja: ...") y la operación cierra
      las participaciones como antes.
```
