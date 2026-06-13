# Visor de documentos en pantalla (modal)

Reemplaza el botón "Ver" actual (que abre el archivo en pestaña nueva) por un
**visor embebido en un modal**: tocás "Ver" y el PDF o imagen se muestra dentro
del sistema, sin descargar ni salir de la página. Con botones para abrir en
pestaña nueva o descargar, y cierre con Escape.

Reutiliza la infraestructura que ya tenés: la ruta
`/api/archivos/[id]/descargar?modo=ver` (URL firmada inline, RLS aplicada) y el
flag `visualizable` de la página.

## Qué se puede ver

- **PDF** → embebido en `<iframe>`.
- **Imágenes** (png, jpg, etc.) → embebidas en `<img>`.
- **Word / Excel** → NO se previsualizan (igual que hoy). Para esos, el botón
  "Ver" ni siquiera aparece, porque la página solo lo muestra si `visualizable`
  es true. El flujo de esos sigue siendo descargar.

## Archivos

**1. Nuevo — `components/documentos/VisorDocumento.tsx`**
Subílo tal cual (incluido). Es el botón "Ver" + el modal, todo en un componente
cliente. Ya pasó chequeo de tipos.

**2. Editar — `app/(app)/documentos/[id]/page.tsx`**
Reemplazar el `<a>` del botón "Ver" actual por el componente nuevo.

### 2.1 Import

Agregá el import junto a los otros componentes de documentos (cerca de la línea
16, donde está `StatusDot`):

```diff
 import { StatusDot } from "@/components/documentos/StatusDot";
+import { VisorDocumento } from "@/components/documentos/VisorDocumento";
```

### 2.2 Reemplazar el botón "Ver"

Buscá este bloque (está alrededor de la línea 294, dentro de
`{visualizable && (...)}`):

```diff
-                      {visualizable && (
-                        <a
-                          href={`/api/archivos/${archivoPrincipal.id}/descargar?modo=ver`}
-                          target="_blank"
-                          rel="noopener noreferrer"
-                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
-                          title={`Ver ${archivoPrincipal.nombre_original}`}
-                        >
-                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
-                          Ver
-                        </a>
-                      )}
+                      {visualizable && (
+                        <VisorDocumento
+                          archivoId={archivoPrincipal.id}
+                          mimeType={archivoPrincipal.mime_type}
+                          nombreOriginal={archivoPrincipal.nombre_original}
+                        />
+                      )}
```

> El botón "Descargar" que está al lado NO se toca. Y el import de `Eye` podés
> dejarlo (quizás se usa en otro lado); si queda sin usar y te molesta el
> warning, sacalo del import de lucide.

## Cómo funciona

- Tocás "Ver" → se abre el modal a pantalla casi completa con el documento.
- Arriba: nombre del archivo + botones "Pestaña nueva", "Descargar" y "Cerrar".
- Cierra con el botón Cerrar, con Escape, o tocando fuera no (es intencional,
  para no cerrarlo sin querer mientras leés).
- Mientras carga muestra un spinner.

## Notas técnicas

- La URL firmada dura 5 minutos (como ya estaba). Si el documento es muy largo y
  lo dejás abierto más de 5 min, recargá el modal (cerrá y volvé a abrir).
- El visor respeta la RLS: si el usuario no tiene permiso sobre el archivo, la
  ruta devuelve 404 y el iframe muestra el error de la ruta.

## Checklist

- [ ] Subido `components/documentos/VisorDocumento.tsx`.
- [ ] Import agregado en la página de detalle.
- [ ] Botón "Ver" reemplazado por `<VisorDocumento ... />`.
- [ ] Build verde.
- [ ] En un documento con PDF: tocar "Ver" abre el modal con el PDF embebido;
      Escape lo cierra.
- [ ] En un documento con Word/Excel: no aparece "Ver" (solo "Descargar"), como
      antes.
