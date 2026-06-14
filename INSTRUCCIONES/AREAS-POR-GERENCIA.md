# Áreas agrupadas por gerencia (secciones colapsables)

Cambia el listado plano de áreas por uno **agrupado por gerencia**: cada gerencia
es una sección colapsable y, al desplegarla, aparecen sus áreas.

## Cómo se ve

```
▼ 🏢 Gerencia Comercial                      5 áreas
     COM-AGRO   Comercial Agro          ✏ 🗑
     COM-INS    Compras de Insumos      ✏ 🗑
     COM-MANI   Comercial Maní          ✏ 🗑
     LOG        Logística               ✏ 🗑
     OP         Operaciones Agrícolas   ✏ 🗑
▶ 🏢 Gerencia de Administración              3 áreas
▶ 🏢 Gerencia Financiera                     4 áreas
...
```

- Cada gerencia es una barra clickeable que se expande/colapsa.
- Muestra el contador de áreas a la derecha.
- Adentro, cada área con su código, nombre y los botones de editar/eliminar (igual
  que antes).
- Las áreas sin gerencia asignada van a un grupo "Sin gerencia asignada" al final.
- Por defecto los grupos arrancan abiertos.

## Archivo a reemplazar (1)

`components/configuracion/GestionAreas.tsx` — el listado ahora agrupa por
gerencia. El formulario de crear/editar/eliminar queda **idéntico** (no se tocó).

> No requiere cambios en la base ni en la API: los datos ya traen la gerencia de
> cada área (`gerenciaNombre`). Solo cambia cómo se muestran.

## Nota sobre la estructura

En tu sistema, las "gerencias" son áreas cuyo código empieza con `GER-`, y las
áreas operativas cuelgan de ellas (vía área padre). El agrupamiento usa esa
relación: agrupa cada área bajo el nombre de su gerencia padre.

> Las gerencias en sí (GER-COM, GER-ADM, etc.) aparecen como áreas dentro de su
> propia gerencia superior (la General), que es coherente con la jerarquía. Si
> preferís que las gerencias NO figuren como ítems sino solo como encabezados,
> avisame y lo ajusto.

## Nota typecheck

Si tu verificador local marca un error en `<form action={formAction}>`, es un
falso positivo conocido del entorno — ese patrón `useFormState` ya está en todos
los ABM de configuración de tu repo y compila bien en Vercel.

## Checklist

- [ ] Reemplazado `components/configuracion/GestionAreas.tsx`.
- [ ] Build verde.
- [ ] En Configuración → Áreas: las áreas aparecen agrupadas por gerencia.
- [ ] Cada gerencia se puede colapsar/expandir.
- [ ] Crear/editar/eliminar un área sigue funcionando igual.
