# Fase 4: acciones, versiones y lecturas

## Alcance

Cada accion de una NC puede requerir un cambio documental y vincular una version
resultante concreta. Varias acciones pueden reutilizar una misma version. Para
cambiar varios documentos se registran acciones separadas.

Desde la accion se puede elegir una version visible o crear un borrador. La
creacion y vinculacion son atomicas, con actor autenticado y motivo heredado de
la accion. Repetir la solicitud devuelve el mismo borrador. No concede permisos
nuevos para editar documentos: mantiene RLS y el circuito de aprobacion existente.
El archivo se adjunta en la ficha documental mediante el control ya disponible.

- Completar requiere version aprobada y vigente, documento activo y archivo principal.
- Verificar eficacia requiere terminar las lecturas si el documento las exige.
- La firma de lectura debe corresponder al hash del archivo principal actual.
- Sin destinatarios de lectura no se considera cumplida una distribucion obligatoria.
- La verificacion conserva una instantanea de version, archivos y acuses.
- El cierre rechaza una verificacion si luego cambia ese contexto documental.
- Mi trabajo incorpora bloqueos documentales; no solicita verificacion mientras
  falten lecturas y no ofrece cierre con documentacion pendiente.
- El documento muestra las acciones vinculadas que el usuario puede consultar.

No se modifican automaticamente documentos ni NC historicas. Las acciones previas
mantienen por defecto la configuracion sin cambio documental requerido.

## Base de datos

Migracion local: `migraciones/095_fase_4_cambios_documentales.sql`.
Aplicada en SGI como `20260921020806_fase_4_cambios_documentales`.

La prueba detecto recursion entre la politica UPDATE de versiones y las
politicas de aprobaciones. El intento inicial revirtio por completo. Se aislo
la consulta del aprobador en un helper privado vinculado al usuario actual,
conservando los actores habilitados y agregando WITH CHECK consistente.
Luego se aplicaron migracion y pruebas de fases 3 y 4 en una unica transaccion.

## Verificacion

- Compilacion de produccion, TypeScript y lint superados; advertencia preexistente
  de useMemo en FlujogramasVista.
- `tests/fase3-ciclo-mejora.sql`: regresion del circuito de Compras ISO9001.
- `tests/fase4-cambios-documentales.sql`: borrador idempotente, vinculacion,
  aprobacion administrativa existente, lecturas firmadas, independencia, RLS,
  invalidacion documental y cierre.
- Los cambios sin version o con borrador no permiten completar.
- No se puede desactivar mediante la accion una lectura documental obligatoria.
- Una firma sobre otro contenido no permite cerrar.
- Todos los fixtures, firmas y acuses revierten. Los incrementos de secuencias
  pueden dejar saltos normales.

Datos conservados despues de las pruebas: 75 documentos, 75 versiones,
4 NC, 2 acciones, 25 acuses y 11 firmas.

## Limites de la prueba

Los tests ejecutan operaciones con el rol authenticated e identidades existentes,
pero no realizan login ni reautenticacion de contrasena en navegador. Las firmas
de los fixtures comprueban las reglas SQL, no representan firmas reales persistidas.
El archivo de prueba es metadata SQL; no se subio contenido a Storage.

La aprobacion probada es la via administrativa autorizada ya existente. Falta
validacion visual autenticada, carga/descarga real y recorrido completo de
aprobacion multinivel. Tampoco se ejecutaron pruebas de carga o concurrencia.
No se afirma que esta fase resuelva aislamiento multiempresa ni todos los avisos
de seguridad del proyecto.

## Prueba de aceptacion

1. En una accion abierta de Compras, abrir Cambio documental.
2. Elegir documento y Crear borrador desde esta accion.
3. Adjuntar archivo en la ficha y completar el circuito habitual de aprobacion.
4. Volver a la NC y completar la accion con resultado y evidencia.
5. Firmar los acuses requeridos desde Mi trabajo con los destinatarios reales.
6. Como verificador independiente, revisar la eficacia y luego cerrar la NC.
7. Confirmar el enlace de retorno desde el documento a la accion y NC.

Los selectores muestran hasta 250 documentos visibles y 50 versiones por documento.
Los documentos que exigen lectura sin destinatarios requieren configurar su
distribucion antes de verificar eficacia; no se inventan destinatarios.

## Operacion y contingencia

Aplicar la migracion antes del frontend. La extension es aditiva; la configuracion
previa de acciones queda sin requisitos documentales nuevos.
Si falla una ruta critica, suspender esa operacion y corregir hacia adelante.
No borrar columnas, versiones, acuses ni evidencias para revertir. Volver al
frontend previo no permite gestionar los vinculos nuevos, aunque la base conserva
las restricciones de seguridad.

Referencias de seguridad:
- Advisor posterior a la migracion: 4 extensiones en public, 99 funciones
  SECURITY DEFINER ejecutables por authenticated y proteccion contra contrasenas
  filtradas desactivada. El nuevo RPC documental agrega una advertencia de
  ejecucion intencional y valida acceso a la NC; los avisos no equivalen por si
  solos a una vulnerabilidad comprobada y requieren revision individual.
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/database-linter
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
