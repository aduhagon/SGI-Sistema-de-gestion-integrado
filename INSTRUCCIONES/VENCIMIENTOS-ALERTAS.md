# Vencimientos y alertas automáticas — YA APLICADO

Este motor **ya está funcionando en producción**. No requiere deploy de
frontend: vive entero en la base (función + cron job). Este paquete es el
**respaldo de la migración** para tu repo y la documentación de cómo funciona.

## Qué hace

Todos los días a las **7 AM**, un job revisa cuatro tipos de vencimiento y genera
notificaciones (que aparecen en la campana del sistema) a los responsables:

| Vencimiento | Campo | A quién avisa |
|---|---|---|
| Documento a revisar | `documentos.proxima_revision` | Gestores del SGI (admin / responsable_sgi) |
| NC sin cerrar a tiempo | `no_conformidades.fecha_limite_cierre` | `responsable_tratamiento_id` |
| Riesgo a re-evaluar | `riesgos.fecha_revision` | `responsable_id` |
| Acuse pendiente vencido | `acuses_lectura.plazo_objetivo` | `usuario_id` (quien debe firmar) |

### Avisa antes Y después

- **7 días antes** del vencimiento: notificación de prioridad media ("por
  vencer" / "a revisar pronto").
- **Después** del vencimiento: prioridad alta ("vencida" / "sin cerrar").

### Anti-spam

No repite la misma notificación para la misma entidad/usuario si ya mandó una en
los últimos 7 días. Así el responsable recibe un recordatorio semanal, no uno
por día.

## Estado actual (verificado)

Al aplicarlo, generó **1 notificación real**: la NC-2026-002 "Contaminación" que
venció el 12/06 y sigue abierta. Los otros tres dieron 0 porque todavía no hay
documentos/riesgos/acuses con fechas de vencimiento cargadas — se irán
disparando a medida que cargues esas fechas.

## Lo que ya quedó en la base

- Enum `notificacion_tipo_enum`: + `documento_revision_proxima`, `nc_vencida`,
  `riesgo_revision_proxima` (acuses reusa `acuse_pendiente`).
- Función `fn_procesar_vencimientos()`.
- Cron job `sgi-vencimientos` (diario 7 AM), activo. Convive con el job existente
  `sgi-acciones-vencidas` (10 AM).

## Mejora opcional recomendada: ícono en la campana

Las notificaciones nuevas usan tipos que tu campana quizás no tiene ícono
asignado. Para que se vean con ícono propio (no el genérico), agregá en
`components/layout/CampanaNotificaciones.tsx`, en el `ICONO_POR_TIPO`:

```diff
+  documento_revision_proxima: Calendar,
+  nc_vencida: AlertTriangle,
+  riesgo_revision_proxima: Calendar,
```

(usando íconos de lucide que ya importás; `Calendar` y `AlertTriangle` son
buenas opciones). Si no lo hacés, igual funcionan, solo muestran el ícono por
defecto.

## Mejora futura: enviar también por email

Hoy las alertas aparecen en la campana del sistema. Si querés que además lleguen
por **email** (usando tu SMTP de Gmail ya configurado), es un paso más: una Edge
Function que lea las notificaciones nuevas de `origen_sistema='job_vencimientos'`
y las mande por mail. Decímelo y lo armo — requiere `pg_net` o una Edge Function
programada.

## Comandos útiles (en el SQL editor de Supabase)

```sql
-- Ejecutar manualmente (prueba):
SELECT * FROM fn_procesar_vencimientos();

-- Ver los jobs programados:
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Desactivar temporalmente:
SELECT cron.unschedule('sgi-vencimientos');

-- Ver últimas notificaciones generadas por el job:
SELECT tipo, titulo, mensaje, fecha_envio FROM notificaciones
WHERE origen_sistema='job_vencimientos' ORDER BY fecha_envio DESC LIMIT 20;
```

## Archivos de respaldo (para tu repo, opcional)

- `migraciones/020a_tipos_notificacion_vencimientos.sql`
- `migraciones/020b_funcion_y_cron_vencimientos.sql`

No hace falta correrlos (ya están aplicados); son para que tu historial de
migraciones quede completo.
