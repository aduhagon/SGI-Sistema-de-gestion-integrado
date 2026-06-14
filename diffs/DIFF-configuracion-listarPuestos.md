# Diff quirúrgico para `lib/api/configuracion.ts`

Solo se tocan DOS cosas: el tipo `Puesto` y la función `listarPuestos`. NO
reemplaces el archivo entero — solo aplicá estos dos cambios.

---

## Cambio 1 — Tipo `Puesto`

BUSCAR (cerca de "// ---- Puestos ----"):

```ts
export type Puesto = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  areaId: string | null;
  areaNombre: string | null;
};
```

REEMPLAZAR POR:

```ts
export type Puesto = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  areaId: string | null;
  areaNombre: string | null;
  gerenciaId: string | null;
  gerenciaNombre: string | null;
};
```

(solo se agregaron las 2 últimas líneas)

---

## Cambio 2 — Función `listarPuestos`

BUSCAR el bloque que resuelve el área en memoria y el return:

```ts
  // Resolver nombre de área en memoria (evita join frágil).
  const filas = (data ?? []) as any[];
  const areaIds = [...new Set(filas.map((p) => p.area_id).filter(Boolean))];
  const nombreArea = new Map<string, string>();
  if (areaIds.length > 0) {
    const { data: areas } = await supabase
      .from("areas")
      .select("id, nombre")
      .in("id", areaIds);
    for (const a of (areas ?? []) as any[]) nombreArea.set(a.id, a.nombre);
  }

  return filas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    areaId: p.area_id,
    areaNombre: p.area_id ? nombreArea.get(p.area_id) ?? null : null,
  }));
}
```

REEMPLAZAR POR:

```ts
  // Resolver nombre de área + su gerencia (área padre) en memoria.
  const filas = (data ?? []) as any[];
  const areaIds = [...new Set(filas.map((p) => p.area_id).filter(Boolean))];
  const nombreArea = new Map<string, string>();
  const padreDeArea = new Map<string, string | null>();
  const nombrePorAreaId = new Map<string, string>();
  if (areaIds.length > 0) {
    const { data: areas } = await supabase
      .from("areas")
      .select("id, nombre, area_padre_id")
      .in("id", areaIds);
    for (const a of (areas ?? []) as any[]) {
      nombreArea.set(a.id, a.nombre);
      padreDeArea.set(a.id, a.area_padre_id ?? null);
    }
    // Traer los nombres de las gerencias (áreas padre).
    const padreIds = [...new Set([...padreDeArea.values()].filter(Boolean) as string[])];
    if (padreIds.length > 0) {
      const { data: padres } = await supabase
        .from("areas")
        .select("id, nombre")
        .in("id", padreIds);
      for (const g of (padres ?? []) as any[]) nombrePorAreaId.set(g.id, g.nombre);
    }
  }

  return filas.map((p) => {
    const gerenciaId = p.area_id ? padreDeArea.get(p.area_id) ?? null : null;
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      areaId: p.area_id,
      areaNombre: p.area_id ? nombreArea.get(p.area_id) ?? null : null,
      gerenciaId,
      gerenciaNombre: gerenciaId ? nombrePorAreaId.get(gerenciaId) ?? null : null,
    };
  });
}
```

---

Con esos dos cambios, cada puesto ya sabe su área y su gerencia, que es lo que el
componente nuevo necesita para agrupar en dos niveles.
