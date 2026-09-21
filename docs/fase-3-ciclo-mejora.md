# Fase 3: tratamiento y eficacia

## Alcance

- Ejecuciones de control con una instantanea de proceso, riesgos, requisitos,
  documentos y referencia a la version documental vigente al ejecutar.
- Apertura de NC desde resultados parciales o inefectivos, sin inventar auditorias.
- Hallazgos de auditoria vinculables a ejecuciones. Conversion atomica e idempotente
  a NC una vez cerrada la auditoria; reutilizacion de la NC de esa ejecucion.
- Plan con responsable, fechas, correccion inmediata y verificador SGI independiente.
- Resultado y evidencia descriptiva obligatorios al completar acciones.
- Cierre sin forzado: causa, correctiva completada, todas las acciones tratadas
  y ultima verificacion eficaz de la revision vigente.
- Pendientes personales de tratamiento, verificacion, cierre y controles observados.
- Cierre sincronizado con los hallazgos vinculados. Historial cerrado inmutable.

## Despliegue

Aplicar `migraciones/094_fase_3_ciclo_mejora.sql` antes del codigo de esta fase.
La migracion se aplico a SGI `hghzpuvxggvpgwzpzaqw` como
`20260921005733_fase_3_ciclo_mejora`, junto con las pruebas dentro de la misma
transaccion. Un primer intento detecto un problema INSERT RETURNING con la politica
RLS; se revirtio completamente, se corrigio y el segundo paso completo las pruebas.

La version antigua de la interfaz no captura evidencia de acciones ni plan de
verificacion. No prolongar la ventana entre base y aplicacion.

## Verificacion ejecutada

`tests/fase3-ciclo-mejora.sql` se ejecuta como administrador, cambia a
`authenticated` para el circuito funcional y revierte los fixtures en una
subtransaccion. Usa Compras (AP-CMP), ISO9001 8.4 y referencias existentes.
Requiere dos usuarios SGI activos y un usuario ajeno sin puesto.

Comprueba:

- Trazabilidad requisito, proceso, riesgo, control, documento y ejecucion.
- NC unica por ejecucion, conversion de hallazgo y reutilizacion de NC existente.
- RLS: un usuario ajeno no lee la NC, no modifica acciones ni cierra la NC.
- No se consultan pendientes ajenos ni se permite el cierre forzado.
- Acciones y verificaciones requieren evidencia; no se admite autoverificacion.
- Las acciones verificadas pertenecen a la NC y estan completadas.
- Una verificacion negativa posterior prevalece sobre una eficacia anterior.
- Cambiar causa o acciones invalida la revision verificada.
- Se generan pendientes por etapa y se retiran al cerrar.
- El cierre sincroniza el hallazgo y bloquea posteriores cambios de acciones.

La auditoria cerrada se crea como fixture; esta prueba no recorre la aprobacion
del informe de auditoria. No prueba sesiones simultaneas ni carga.
Las secuencias pueden tener saltos porque sus incrementos no revierten.
Los registros operativos se conservaron: 4 NC, 2 acciones, 3 verificaciones,
0 ejecuciones, ningun fixture residual.

Compilacion de produccion, TypeScript y lint superados. Persiste una advertencia
previa de useMemo en FlujogramasVista. No se afirma un E2E autenticado en navegador:
la sesion disponible no estaba iniciada.

## Aceptacion funcional pendiente

1. Abrir Compras, ejecutar un control con resultado parcial/inefectivo y evidencia.
2. En su historial, abrir la NC y completar plan y causa.
3. Crear una correctiva y completarla con resultado y evidencia.
4. Ingresar como el otro usuario SGI asignado, revisar Mi trabajo y verificar.
5. Volver al responsable, cerrar y comprobar proceso e historial.
6. Repetir con un hallazgo vinculado a la ejecucion: debe abrir la misma NC.

## Compatibilidad y limites

- No se reescriben verificaciones historicas. Sin revision registrada no habilitan
  nuevos cierres: requieren plan y verificacion vigente. Los cierres historicos
  conservan sus datos.
- La evidencia de accion es descriptiva; los adjuntos existentes siguen disponibles
  en la NC y en la verificacion. No se agrega carga de archivos por accion.
- Se conservan los permisos globales SGI/auditor existentes. Esta fase no introduce
  aislamiento multiempresa ni certifica la seguridad completa del sistema.
- El selector de ejecuciones de auditoria muestra las 100 mas recientes del alcance;
  el historial por control esta paginado de a 25.
- Supabase mantiene avisos de extensiones en public, funciones SECURITY DEFINER
  accesibles a usuarios autenticados y proteccion de contrasenas filtradas desactivada.
  Las nuevas RPC privilegiadas comprueban actor/acceso y fijan search_path.
  Referencias: https://supabase.com/docs/guides/database/database-linter
  y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Contingencia

Si falla el despliegue, corregir hacia adelante y volver a desplegar. No eliminar
columnas, evidencias, secuencias ni registros para revertir. Volver solo al frontend
anterior no recupera el flujo de completar/verificar: no contiene los campos ahora
obligatorios. Ante fallos en NC o pendientes, suspender esas operaciones hasta
restablecer una version compatible. La migracion es transaccional.
