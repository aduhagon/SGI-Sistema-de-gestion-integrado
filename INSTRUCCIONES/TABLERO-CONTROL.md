# Tablero de control — mapa de calor por proceso

Pantalla nueva que muestra el estado de control de cada proceso con un mapa de
calor (verde / amarillo / rojo / gris).

## Cómo funciona el color

Cada proceso evalúa 4 señales y toma el **peor estado** entre las evaluables:

| Señal | Verde | Amarillo | Rojo | Gris |
|-------|-------|----------|------|------|
| **No conformidades** | sin NC abiertas | NC abierta en plazo | NC vencida | — |
| **Documentos** | docs al día | — | revisión vencida | sin documentos |
| **Indicadores** | en meta | sin medición reciente | incumple meta | sin indicadores |
| **Riesgos** | bajo control | — | alto sin tratar | sin riesgos |

**Clave del diseño:** "gris" (sin datos) NO penaliza. Un proceso vacío sale gris
("pendiente de configurar"), no verde ni rojo. A medida que cargás el sistema,
los grises se vuelven verdes (o rojos si hay un problema real). Así el tablero es
honesto desde el día uno.

Con tus datos actuales: 2 verde (OP-AGR, AP-MAN), 1 amarillo (EST-COM, 1 NC),
2 rojo (OP-IND, OP-IDI, riesgo alto sin tratar), 10 gris (sin datos aún).

## Lo que ya está aplicado en la base

`fn_mapa_calor_procesos()` — función verificada que calcula todo. No requiere más
cambios en la base.

## Archivos a subir (4)

1. **`lib/api/mapaCalor.ts`** (nuevo) — helper que llama la función RPC.
2. **`components/tablero/MapaCalor.tsx`** (nuevo) — la grilla de tarjetas con los
   colores y las 4 señales por proceso, agrupada por tipo (estratégico/operativo/
   apoyo) + chips de resumen arriba.
3. **`app/(app)/tablero/page.tsx`** (nuevo) — la página, con leyenda explicativa.
4. **`components/layout/SidebarNav.tsx`** (reemplazo) — agrega "Tablero de control"
   en la sección Calidad & Auditoría (antes de Cumplimiento). Visible para gestores.

## Notas

- La carpeta `app/(app)/tablero/` es nueva: en el GitHub web UI, al crear el
  archivo `page.tsx`, escribí la ruta completa `app/(app)/tablero/page.tsx` y
  GitHub crea la carpeta sola.
- El SidebarNav de este paquete es el actual del repo + el ítem nuevo. Reemplazalo.
- Cada tarjeta linkea al detalle del proceso (`/procesos/{id}`).
- El umbral de "riesgo alto" es prob × impacto ≥ 15 (el clásico del 5×5). Si querés
  otro umbral, avisame.

## Checklist

- [ ] Subidos los 3 archivos nuevos (mapaCalor.ts, MapaCalor.tsx, tablero/page.tsx).
- [ ] Reemplazado SidebarNav.tsx.
- [ ] Build verde.
- [ ] Aparece "Tablero de control" en el menú (Calidad & Auditoría).
- [ ] El tablero muestra los procesos con sus colores y señales.
