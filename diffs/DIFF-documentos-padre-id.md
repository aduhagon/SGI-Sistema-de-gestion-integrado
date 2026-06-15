# Diff quirúrgico — `lib/api/documentos.ts`

Solo se suma el campo `documento_padre_id` al `DocumentSummary` (para poder ordenar
por jerarquía). Son 3 cambios chicos. NO reemplaces el archivo entero.

---

## Cambio 1 — Tipo `DocumentSummary`

BUSCAR:
```ts
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  tipo: {
    codigo: string;
    nombre: string;
    color_hex: string | null;
    icono: string | null;
  } | null;
```

REEMPLAZAR POR (agrega 1 línea: documento_padre_id):
```ts
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  documento_padre_id: string | null;
  tipo: {
    codigo: string;
    nombre: string;
    color_hex: string | null;
    icono: string | null;
  } | null;
```

---

## Cambio 2 — Tipo `DocumentoRaw`

BUSCAR:
```ts
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  tipo: DocumentSummary["tipo"];
  proceso: DocumentSummary["proceso"];
```

REEMPLAZAR POR:
```ts
  estado_actual: string;
  criticidad: string;
  creado_en: string;
  actualizado_en: string | null;
  documento_padre_id: string | null;
  tipo: DocumentSummary["tipo"];
  proceso: DocumentSummary["proceso"];
```

---

## Cambio 3 — Función `normalizar` (el return)

BUSCAR:
```ts
    estado_actual: doc.estado_actual,
    criticidad: doc.criticidad,
    creado_en: doc.creado_en,
    actualizado_en: doc.actualizado_en,
    tipo: doc.tipo,
    proceso: doc.proceso,
    normas,
  };
```

REEMPLAZAR POR:
```ts
    estado_actual: doc.estado_actual,
    criticidad: doc.criticidad,
    creado_en: doc.creado_en,
    actualizado_en: doc.actualizado_en,
    documento_padre_id: doc.documento_padre_id,
    tipo: doc.tipo,
    proceso: doc.proceso,
    normas,
  };
```

---

## Cambio 4 — El SELECT (`SELECT_DOCUMENTO`)

BUSCAR:
```ts
  estado_actual,
  criticidad,
  creado_en,
  actualizado_en,
  tipo:tipos_documentales (codigo, nombre, color_hex, icono),
```

REEMPLAZAR POR (agrega documento_padre_id a la consulta):
```ts
  estado_actual,
  criticidad,
  creado_en,
  actualizado_en,
  documento_padre_id,
  tipo:tipos_documentales (codigo, nombre, color_hex, icono),
```

---

Con esos 4 cambios, cada documento del listado ya trae su `documento_padre_id`,
que el componente usa para el ordenamiento por jerarquía.
