# Historial de versiones (solo administradores)

Muestra, en el detalle de un documento, **todas sus versiones** con su estado,
fecha y motivo de cambio, y permite abrir cualquiera en el visor. **Solo lo ven
los administradores** (gestores). El usuario común sigue trabajando únicamente
con la versión vigente y no ve este historial.

## Archivos

**Nuevos (subir):**
1. `lib/api/historialVersiones.ts` — función `obtenerHistorialVersiones(documentoId)`.
2. `components/documentos/HistorialVersiones.tsx` — la tabla de versiones con
   visor por versión.

**Editar:**
3. `app/(app)/documentos/[id]/page.tsx` — cargar el historial + el rol, y montar
   el componente solo si el usuario es gestor.

> Requiere que ya tengas subido `components/documentos/VisorDocumento.tsx` (del
> paquete del visor). El historial lo reutiliza para abrir cada versión.

## 3. Editar la página de detalle

En `app/(app)/documentos/[id]/page.tsx`:

### 3.1 Imports

```diff
+import { obtenerHistorialVersiones } from "@/lib/api/historialVersiones";
+import { HistorialVersiones } from "@/components/documentos/HistorialVersiones";
+import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
```

### 3.2 Cargar historial + perfil

La página ya carga el documento. Sumá la carga del historial y del perfil (para
saber si es admin). Buscá donde se obtienen los datos del documento y agregá:

```tsx
const perfil = await obtenerPerfilMenu();
const historialVersiones = perfil.esGestor
  ? await obtenerHistorialVersiones(documentoId)
  : [];
```

> `documentoId` es el id del documento que la página ya tiene (puede llamarse
> `params.id` o una variable resuelta; usá la que corresponda en tu página).
> Si solo cargás el historial cuando `esGestor`, evitás la query para usuarios
> comunes.

### 3.3 Montar el componente

Cerca del final del contenido del documento (después de las secciones que ya
tenés, antes de cerrar el contenedor principal), montá el historial **solo para
gestores**:

```tsx
{perfil.esGestor && historialVersiones.length > 0 && (
  <HistorialVersiones versiones={historialVersiones} />
)}
```

> El componente ya trae su propio título "Historial de versiones" con la etiqueta
> "Solo administradores", así que no necesitás agregar encabezado.

## Cómo se ve

- **Tabla de versiones** (más nueva arriba): número (v1.0, v2.0…), estado con
  color, fecha, motivo del cambio, y acción sobre el archivo.
- La **versión vigente** queda resaltada con un chip verde "Vigente".
- Estados con color: aprobado/vigente en verde, pendiente/confeccionado en
  ámbar, rechazado en rojo, obsoleto en gris.
- En la columna de archivo: si es PDF/imagen, botón "Ver" (abre el visor en
  modal); si es Word/Excel, botón "Descargar"; si no hay archivo, "Sin archivo".

## Verificado contra tu base

- Estados de versión: `borrador`, `confeccionado`, `pendiente_aprobacion`,
  `aprobado`, `rechazado`, `obsoleto` + flag `es_vigente`.
- La RLS de `archivos` filtra por visibilidad del **documento**, no por versión,
  así que un admin que ve el documento puede abrir el archivo de cualquier
  versión histórica. (Para usuarios comunes no se muestra el historial, así que
  no aplica.)
- Hoy tus documentos tienen 1 versión cada uno; el historial se irá poblando a
  medida que crees v2.0, v3.0, etc. con el flujo de "nueva versión" que ya
  tenés.

## Checklist

- [ ] Subido `lib/api/historialVersiones.ts`.
- [ ] Subido `components/documentos/HistorialVersiones.tsx`.
- [ ] Editada la página de detalle (imports + carga condicional + montaje).
- [ ] Build verde.
- [ ] Con usuario gestor: en el detalle de un documento aparece "Historial de
      versiones" con la(s) versión(es) y su estado; se puede abrir en el visor.
- [ ] Con usuario común: NO aparece el historial (solo ve la versión vigente).
