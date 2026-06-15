# Tablero de NC embebido en /ncs (colapsable) + filtro soft-delete

Mueve el tablero de no conformidades a la propia página `/ncs`, colapsable con un
botón "Ver tablero" arriba de la lista. Elimina la página separada `/tablero-nc`.
Además, el tablero ahora cuenta solo NC activas y no eliminadas.

## Base de datos — YA APLICADO (no corras nada)

Dos migraciones aplicadas en vivo y verificadas:
1. Rango de fechas en las 4 funciones del tablero (`p_desde`/`p_hasta`).
2. Filtro soft-delete: las 4 funciones ahora exigen `nc.activo = true AND
   nc.eliminado_en IS NULL`, igual que la lista de `/ncs`. Quedó **una sola
   versión** de cada función (sin overloads).

## Archivos del zip — subir/reemplazar (GitHub web UI)

| Archivo | Acción |
|---|---|
| `app/(app)/ncs/page.tsx` | **REEMPLAZA** — tablero colapsable arriba de la lista |
| `components/tablero-nc/PanelTableroNC.tsx` | **NUEVO** — agrupa filtro + KPIs + gráficos |
| `components/tablero-nc/BotonTablero.tsx` | **NUEVO** — toggle Ver/Ocultar tablero |
| `components/tablero-nc/FiltroFechas.tsx` | **REEMPLAZA** — ahora navega a /ncs, no a /tablero-nc |

### Si todavía no tenías el paquete anterior, sumá también estos (sin cambios):
| Archivo | Acción |
|---|---|
| `lib/api/tableroNC.ts` | del paquete anterior (pasa el rango a los RPC) |
| `lib/api/rangoFechasNC.ts` | del paquete anterior (presets) |

> `EvolucionNC.tsx` y `CortesNC.tsx` ya existen y **no se tocan**.

## BORRAR — página vieja del tablero

Eliminá del repo la carpeta completa:

```
app/(app)/tablero-nc/
```

Contiene el `page.tsx` viejo. Ya nada lo enlaza (el botón "Tablero" que apuntaba
ahí fue reemplazado por el toggle "Ver tablero" dentro de /ncs).

> En la web UI de GitHub: entrá a cada archivo dentro de `app/(app)/tablero-nc/`,
> usá el ícono de papelera (Delete file) y commiteá. Si solo está el `page.tsx`,
> con borrar ese archivo alcanza; la carpeta vacía desaparece sola.

## Cómo funciona

- El tablero arranca **oculto**. El botón "Ver tablero" agrega `?tablero=1` a la
  URL y lo despliega arriba de la lista; "Ocultar tablero" lo saca.
- El filtro de período (presets + custom) vive en la URL junto con `tablero=1`,
  así al cambiar el rango el tablero **sigue abierto**.
- Solo lo ven los gestores (`perfil.esGestor`), igual que antes.
- Cuando el tablero está cerrado no se consulta la base por sus datos (la página
  solo trae la lista). Se carga al desplegarlo.

## Verificación tras el deploy

1. Entrá a `/ncs` → lista igual que siempre, con botón "Ver tablero" en el header
   (solo si sos gestor).
2. Tocá "Ver tablero" → se despliega arriba con KPIs, evolución y cortes; el botón
   pasa a "Ocultar tablero".
3. Cambiá el período (ej. "Últimos 90 días") → recalcula y el tablero queda abierto.
4. Verificá que `/tablero-nc` ya no exista (404) tras borrar la carpeta.
