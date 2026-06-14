# Listado maestro jerárquico (proceso → padre → hijo)

Vista de árbol con toda la estructura documental: cada **proceso** como sección
colapsable, y adentro los documentos organizados por jerarquía (documento padre
con sus documentos dependientes anidados).

## Cómo se ve

```
● OP-AGR  Operación Agrícola                          4 docs
   ├ 📁 A-MAN-05-001  Arrendamientos              [Pendiente]
   │    └ 📄 A-INS-05-001-001  Prueba             [Vigente]
   ├ 📄 A-MP-05-001  Arrendamientos2              [Vigente]
   └ 📄 A-MP-05-002  Información Documentada       [Borrador]
```

- Cada proceso se puede colapsar/expandir.
- Los documentos con hijos tienen ícono de carpeta; los hojas, de archivo.
- Cada documento muestra código, título, tipo y estado, y es clickeable (lleva
  al detalle).
- Los documentos sin proceso aparecen en una sección "Sin proceso asignado".

## Archivos (nuevos, subir)

1. `lib/api/arbolMaestro.ts` — arma el árbol desde la base (usa
   `documento_padre_id` y `proceso_principal_id`).
2. `components/documentos/ArbolMaestro.tsx` — el árbol expandible.
3. `app/(app)/documentos/maestro/page.tsx` — la página, en la ruta
   `/documentos/maestro`.

## Cómo llegar a la página

La página queda en `/documentos/maestro`. Para tener un acceso, agregá un enlace
en el listado de documentos. En `app/(app)/documentos/page.tsx`, en el header
(cerca del botón "Cargar documento"), podés sumar:

```tsx
<Link
  href="/documentos/maestro"
  className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
>
  <FolderTree className="h-4 w-4" aria-hidden="true" />
  Listado maestro
</Link>
```

(agregando `FolderTree` al import de lucide y, si no está, `Link` de next).

> Alternativamente, podés sumar "Listado maestro" al menú lateral (Sidebar). Si
> querés, te paso ese cambio aparte.

Mientras tanto, podés entrar directo por URL: `/documentos/maestro`.

## Verificado contra tu base

- Existe `documentos.documento_padre_id` (relación jerárquica) y
  `proceso_principal_id`.
- Tu estructura actual ya tiene un caso real: A-INS-05-001-001 es hijo de
  A-MAN-05-001, dentro del proceso OP-AGR. El árbol lo muestra anidado.
- Soporta múltiples niveles (hijos de hijos), no solo dos.

## Checklist

- [ ] Subidos los 3 archivos nuevos.
- [ ] (Opcional) Enlace "Listado maestro" en el header del listado o en el menú.
- [ ] Build verde.
- [ ] En /documentos/maestro: ves los procesos con sus documentos anidados; el
      hijo aparece debajo de su padre, indentado.
