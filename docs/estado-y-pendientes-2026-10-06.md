# SGI Multinorma: estado y pendientes

Fecha de corte: 6 de octubre de 2026. Responsable de priorización: Ale.

## Alcance y evidencia

Inventario basado en código, migraciones, historial Git y documentación del repositorio. La publicación del panel de correo fue confirmada en producción con el commit remoto `4a5eef6efe8a356d4525f12743ffb8671d6e4fc0`. El código local equivalente es `ba30ed0`; los identificadores difieren porque se registraron mediante dos mecanismos.

Este inventario no es una auditoría funcional completa ni certifica permisos, restauraciones, entrega de correo o aprobación multinivel. No se ejecutaron pruebas que escriban datos operativos durante esta revisión. Un archivo de prueba o workflow demuestra que existe el mecanismo, no que su última ejecución haya pasado.

## Avances comprobados

| Bloque | Evidencia | Estado y límite |
| --- | --- | --- |
| Recuperación y claridad del correo | `components/sistema/SaludCorreo.tsx`, `app/(app)/sistema/config-actions.ts` | Publicado el 06/10: reintento iniciado, refresco por un minuto, estados diferenciados, último envío semanal y mensajes independientes del proveedor. La aceptación SMTP no demuestra llegada a bandeja. Ale confirmó funcionamiento del reenvío. |
| Salud, integridad y automatizaciones | `components/sistema/SaludSistema.tsx`; migraciones del 05/10 | Implementado y publicado en bloques anteriores. Diferencia fallas actuales y recuperadas. Valores actuales de producción no se volvieron a consultar en este inventario. |
| Configuración del superadmin | Migraciones `centro_notificaciones_superadmin`, `plazos_operativos_configurables`, `gobierno_integraciones` | Configuración funcional implementada; credenciales sensibles permanecen fuera del navegador. No equivale a validación de todas las combinaciones. |
| Respaldo y continuidad | Migraciones `configuracion_respaldo_continuidad`, `alertas_automaticas_continuidad` | Configuración y alertas implementadas. Registrar un respaldo o su fecha no prueba una restauración exitosa. |
| Marco legal separado de certificaciones | Historial de commits de separación; pruebas `marco-legal.spec.ts` | Código y pruebas existentes. Pendiente confirmar aceptación actual del flujo con matriz BRCGS real; no asumir matriz completa por tener relaciones cargadas. |
| Objetos legibles de bitácora | Migraciones del 24/09 y 25/09; commits `84e1a7a`, `1f3a63e` | Correcciones implementadas. No se verificó aquí cada evento histórico o tipo de entidad. |
| Centro de pendientes | `lib/api/pendientes.ts`, `components/pendientes/CentroPendientes.tsx` | Ya existe: búsqueda, urgencia, módulos, plazos relativos y acceso al objeto o etapa. No proponer construirlo nuevamente. |
| Ciclo NC, eficacia y cambio documental | `docs/fase-3-ciclo-mejora.md`, `docs/fase-4-cambios-documentales.md` | Implementación y pruebas SQL documentadas. La aceptación autenticada completa requiere evidencia posterior para cerrarse. |
| Calidad técnica | Workflows y pruebas en `.github/workflows` y `tests/e2e` | Controles de texto y mecanismos E2E existentes. Estado de las últimas ejecuciones no comprobado en este inventario. |

## Backlog priorizado

Los esfuerzos son estimaciones iniciales; recalibrar tras revisar las funciones SQL y permisos relacionados.

| ID | Prioridad | Pendiente | Evidencia o motivo | Criterio de aceptación | Impacto / esfuerzo |
| --- | --- | --- | --- | --- | --- |
| P-01 | Alta | Avisar si la bandeja está incompleta | En `obtenerMisPendientes`, el error de `fn_pendientes_usuario` se registra en consola y se continúa con los demás resultados; otros helpers también devuelven vacío ante ciertos errores. | Una fuente fallida no puede producir un mensaje de "No tenés pendientes" sin advertencia. Mostrar el alcance incompleto y permitir actualizar, conservando lo recuperado cuando sea apropiado. | Alto / medio |
| P-02 | Alta | Evitar descarte silencioso de módulos nuevos | El agrupado recorre exclusivamente `ORDEN_MODULO`; el propio comentario advierte el descarte. | Todo módulo devuelto aparece con etiqueta conocida o fallback comprensible; mantiene el orden de los conocidos. | Alto / bajo |
| P-03 | Alta | Validar asignación de requisitos legales | El helper carga requisitos visibles y no recibe el usuario para filtrar una asignación explícita. Esto no demuestra un fallo de permisos: puede depender de RLS y del modelo funcional. | Definir quién debe evaluar cada requisito; comprobar con dos perfiles que el centro distingue tareas personales de pendientes compartidos, sin ampliar acceso. | Alto / medio |
| P-04 | Media | Hacer explícita la acción de cada tarjeta | La tarjeta muestra título, código, módulo y plazo, con una flecha genérica. | Mostrar una acción clara según etapa y fecha concreta cuando exista; los ítems sin fecha se identifican sin aparentar vencimiento. Validar en celular y escritorio. | Medio / bajo |
| P-05 | Alta | Cerrar aceptación del ciclo NC documental | Las fases 3 y 4 documentan límites de las pruebas y recorridos pendientes. | Evidencia del circuito real: control observado → NC → acción → documento aprobado → lectura → verificación independiente → cierre. Prueba de bloqueo si falta un paso. | Alto / alto |
| P-06 | Media | Conservar diagnóstico útil del correo | Algunos registros guardan solo "Código HTTP 500"; la UI no puede deducir credenciales incorrectas desde ese dato. | Clasificar errores de autenticación, conexión y configuración sin proveedor fijo ni secretos. Si no se conoce la causa, mostrar diagnóstico general sin inventarla. | Medio / medio |
| P-07 | Media | Verificar respaldo y recuperación | El panel de continuidad informa configuración, no demuestra restaurabilidad. | Evidencia de cobertura de DB y archivos, responsable, procedimiento y comprobación de recuperación en entorno separado cuando Ale lo autorice. No crear base de pruebas ahora. | Alto / alto |
| P-08 | Media | Revisar bitácora desde la perspectiva del auditor | Solicitud previa de evitar interpretaciones incorrectas de pruebas y registros técnicos. | Revisar muestra por entidad y origen; objetos comprensibles y registro veraz de actividad real. No borrar ni reinterpretar eventos para mejorar apariencia. | Medio / medio |
| P-09 | Media | Confirmar último resultado de CI/E2E | Hay workflows; no se consultaron sus runs actuales. | Registrar commit, resultado y alcance de cada ejecución. Diferenciar smoke de recorrido funcional autenticado. | Alto / bajo |

## Orden de trabajo recomendado

1. P-02 y P-01: integridad del Centro de pendientes; no sumar funcionalidades antes de asegurar que informa bien.
2. P-03 y P-04: asignación y acción visible; piloto con un responsable de proceso y un lector.
3. P-09 y P-05: evidencia de aceptación del circuito documental y NC.
4. P-06, P-08 y P-07: diagnóstico persistente, trazabilidad y continuidad.

Quick win estimado menor a dos horas: P-02, sujeto a verificación de contratos de módulos. P-04 puede requerir más tiempo si los datos actuales no permiten distinguir acción de objeto.

## Piloto del próximo bloque

Alcance: Centro de pendientes, sin crear registros ficticios en producción ni una base de pruebas nueva.

- Revisar bandejas existentes con dos roles autorizados.
- Cada tarea debe mostrar qué hacer, objeto, plazo y destino correcto.
- Validar fallas de fuentes y módulos desconocidos con fixtures locales o mocks, sin enviar correos.
- Métrica: ningún pendiente recibido se descarta por su módulo y ninguna falla de consulta se comunica como bandeja completa vacía.
- Validación de uso: ambos participantes identifican la próxima acción de cinco tareas existentes sin explicación adicional.

## Registro para siguientes cambios

### Responsables de evaluación legal: preparado el 06/10

- Migración `20261006120504_responsables_evaluacion_legal.sql`: puesto opcional, FK e índice, validación de puesto activo, guardado atómico compatible con frontend anterior y contexto con SECURITY INVOKER, acceso autenticado y RLS existente.
- Formulario y tarjeta móvil presentan el puesto responsable. No se asignan requisitos históricos automáticamente.
- La tarea personal se obtiene por ocupación vigente, persona y usuario activos. Si hay varios ocupantes habilitados, todos reciben la tarea; no se elige uno arbitrariamente.
- Gestión (roles SGI/auditor o administrador existentes) recibe aviso de requisitos sin asignar, puesto inactivo o sin usuario habilitado. Esta última condición puede ser vacancia o falta de acceso; no se la etiqueta falsamente como vacancia confirmada.
- La asignación define la bandeja, no restringe ni amplía permisos de evaluación existentes. El resumen semanal de correo no se modifica en este bloque; armonizar su cobertura debe revisarse por separado.
- Verificación: estructura y privilegios SQL dentro de transacción con rollback, sin asignaciones nuevas; TypeScript, codificación y cinco casos de bandeja simulados (A/B, gestor, lector y falla de contexto).
- Migración aplicada el 06/10 y consulta verificada con rol authenticated (118 requisitos visibles). Publicación del frontend iniciada. Piloto: Ale elige los requisitos y puestos; validar con ocupantes reales, sin datos ficticios. Aceptación visual y flujo de cambio de ocupación pendientes.

### Bloque de acciones y plazos preparado el 06/10

- Cada tarjeta presenta la acción correspondiente al módulo, manteniendo el destino existente; aprobar o cerrar requiere la revisión del circuito habitual.
- La búsqueda incluye el nombre de la acción. Fecha concreta y plazo relativo visibles; sin fecha se informa explícitamente, sin aparentar vencimiento.
- Los requisitos legales se identifican como visibles por permisos y no como asignaciones personales comprobadas. El helper actual no filtra un responsable explícito. La revisión con dos perfiles sigue pendiente; no se cambiaron permisos ni responsabilidades.
- Verificación: TypeScript, codificación y render estático con datos locales; fechas de calendario sin desplazamiento, timestamps en Buenos Aires y fallback para módulo nuevo.
- Estado: preparado, pendiente de publicación y aceptación visual en celular y escritorio.

### Bloque P-01 / P-02 preparado el 06/10

- Módulos desconocidos se conservan al final del listado con una etiqueta de fallback.
- Fallas de RPC principal, perfil de controles, asignaciones y controles ya no se convierten en listas vacías.
- Para el centro, fallas de consulta de requisitos y sus evaluaciones generan error; se conserva el comportamiento previo de otros consumidores del helper legal.
- La ruta de pendientes muestra un aviso específico con recuperación. El dashboard que usa el mismo helper propaga la falla a su boundary existente, evitando representar esa bandeja como completa.
- Verificación: TypeScript, codificación, diff y cuatro casos simulados sobre el helper real (módulo desconocido, RPC fallida, perfil fallido y vacío válido). Sin datos de prueba en producción.
- Pendiente: publicación y aceptación visual. La configuración conserva sus fallbacks existentes; el resto de helpers generales y contadores independientes del dashboard no forman parte de este bloque.

| ID | Problema | Decisión / alcance | Responsable | Commit / migración | Prueba y evidencia | Publicación | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ejemplo | Describir el problema concreto | Indicar comportamiento esperado | Asignar | Registrar identificadores reales | Qué se verificó y límites | URL, fecha y estado | Propuesto / en curso / preparado / publicado / aceptado |

"Publicado" significa desplegado; "aceptado" requiere validar el comportamiento con el usuario. Las fechas de 30/60/90 días se definirán después de acordar prioridades y disponibilidad, no se asumen como compromisos.
