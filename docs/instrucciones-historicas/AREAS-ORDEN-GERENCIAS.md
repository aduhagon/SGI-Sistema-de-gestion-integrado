# Áreas por gerencia — orden de negocio

Misma vista agrupada por gerencia, pero ahora las gerencias aparecen en un orden
de negocio definido (no alfabético):

1. Gerencia General
2. Gerencia Producción Agrícola
3. Gerencia Producción Industrial
4. Gerencia Comercial
5. Gerencia Financiera
6. Gerencia de Administración

Cualquier gerencia que no esté en esa lista aparece después, ordenada
alfabéticamente. "Sin gerencia asignada" siempre queda al final.

## Archivo a reemplazar (1)

`components/configuracion/GestionAreas.tsx` — incluye el agrupamiento por gerencia
+ el orden de negocio. Si ya subiste el paquete de agrupamiento anterior, este lo
reemplaza (trae todo).

## Si querés cambiar el orden a futuro

El orden está en una lista al principio del componente (`ORDEN_GERENCIAS`). Para
reordenar, se cambia el orden de esos nombres. Avisame y lo ajusto, o lo podés
editar directo si te animás (son los nombres exactos de las gerencias).

## Checklist

- [ ] Reemplazado `components/configuracion/GestionAreas.tsx`.
- [ ] Build verde.
- [ ] En Configuración → Áreas, las gerencias aparecen en el orden:
      General, Prod. Agrícola, Prod. Industrial, Comercial, Financiera,
      Administración.
