-- Ejecutar como administrador de base de datos. Las operaciones funcionales usan
-- el rol authenticated y las identidades existentes. Todo dato de prueba revierte.
DO $test$
DECLARE
  gestor uuid; auth_gestor uuid; verificador uuid; auth_verificador uuid;
  ajeno uuid; auth_ajeno uuid; proceso uuid; requisito uuid; norma uuid; riesgo uuid; documento uuid;
  control uuid; ejecucion uuid; buena uuid; otra uuid; nc uuid; nc_auditoria uuid;
  accion uuid; accion_extra uuid; auditoria uuid; hallazgo uuid; hallazgo2 uuid;
  revision integer; resultado_cierre record; filas integer; rol_original text := current_user;
BEGIN
  BEGIN
    SELECT u.id,u.auth_user_id INTO STRICT gestor,auth_gestor FROM public.usuarios u
      WHERE u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.asignaciones_rol_global a JOIN public.roles_globales r ON r.id=a.rol_id
        WHERE a.usuario_id=u.id AND a.vigente_hasta IS NULL AND r.codigo IN ('admin','responsable_sgi') AND r.activo)
      ORDER BY u.id LIMIT 1;
    SELECT u.id,u.auth_user_id INTO STRICT verificador,auth_verificador FROM public.usuarios u
      WHERE u.id<>gestor AND u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.asignaciones_rol_global a JOIN public.roles_globales r ON r.id=a.rol_id
        WHERE a.usuario_id=u.id AND a.vigente_hasta IS NULL AND r.codigo IN ('admin','responsable_sgi') AND r.activo)
      ORDER BY u.id LIMIT 1;
    SELECT u.id,u.auth_user_id INTO STRICT ajeno,auth_ajeno FROM public.usuarios u
      WHERE u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL
        AND NOT EXISTS(SELECT 1 FROM public.asignaciones_rol_global a JOIN public.roles_globales r ON r.id=a.rol_id
          WHERE a.usuario_id=u.id AND a.vigente_hasta IS NULL AND r.codigo IN ('admin','responsable_sgi','superadmin','auditor','responsable_proceso_general'))
        AND NOT EXISTS(SELECT 1 FROM public.persona_puesto pp WHERE pp.persona_id=u.persona_id AND pp.vigente_hasta IS NULL)
      ORDER BY u.id LIMIT 1;
    SELECT id INTO STRICT proceso FROM public.procesos WHERE codigo='AP-CMP' AND activo AND eliminado_en IS NULL;
    SELECT r.id,r.version_norma_id INTO STRICT requisito,norma FROM public.requisitos r
      JOIN public.versiones_norma v ON v.id=r.version_norma_id JOIN public.normas n ON n.id=v.norma_id
      WHERE r.clausula='8.4' AND n.codigo='ISO9001' AND r.activo AND r.eliminado_en IS NULL LIMIT 1;
    SELECT id INTO STRICT riesgo FROM public.riesgos WHERE proceso_id=proceso AND activo AND eliminado_en IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO STRICT documento FROM public.documentos WHERE proceso_principal_id=proceso AND activo AND eliminado_en IS NULL ORDER BY id LIMIT 1;

    -- La auditoría cerrada es un fixture; su ciclo de aprobación no se modifica.
    INSERT INTO public.auditorias(codigo,titulo,tipo,estado,fecha_planificada,cerrada_por)
      VALUES('AUD-2099-99999','TEST FASE3 Compras ISO 9001','interna','cerrada',current_date,gestor) RETURNING id INTO auditoria;
    INSERT INTO public.auditoria_alcance(auditoria_id,proceso_id,version_norma_id) VALUES(auditoria,proceso,norma);
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    IF current_user<>'authenticated' THEN RAISE EXCEPTION 'La prueba debe ejecutar RLS.'; END IF;
    control := public.fn_guardar_control(NULL,'TEST-F3-COMPRAS',proceso,'Evaluar proveedores TEST',NULL,NULL,
      'preventivo','ad_hoc',NULL,NULL,true,7,NULL,'activo',ARRAY[riesgo],ARRAY[requisito],ARRAY[documento],ARRAY[]::uuid[]);
    ejecucion := public.fn_registrar_ejecucion_control(control,'inefectivo','Proveedor sin evaluar','Orden de compra TEST 001 sin evaluación vigente',NULL);
    buena := public.fn_registrar_ejecucion_control(control,'efectivo','Proveedor evaluado','Evaluación de proveedor TEST conforme',NULL);
    otra := public.fn_registrar_ejecucion_control(control,'parcial','Evaluación incompleta','Orden de compra TEST 002 incompleta',NULL);
    IF NOT EXISTS(SELECT 1 FROM public.control_ejecuciones e WHERE e.id=ejecucion
      AND (e.contexto->'proceso'->>'id')::uuid=proceso
      AND (e.contexto->'requisitos'->0->>'id')::uuid=requisito
      AND (e.contexto->'riesgos'->0->>'id')::uuid=riesgo
      AND (e.contexto->'documentos'->0->>'id')::uuid=documento) THEN
      RAISE EXCEPTION 'Falta trazabilidad de la ejecución.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='controles_observados' AND entidad_id=ejecucion) THEN
      RAISE EXCEPTION 'Falta pendiente de resultado inefectivo.'; END IF;
    nc := public.fn_crear_nc_desde_control(ejecucion);
    IF public.fn_crear_nc_desde_control(ejecucion)<>nc THEN RAISE EXCEPTION 'Apertura duplicada.'; END IF;
    IF EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='controles_observados' AND entidad_id=ejecucion) THEN
      RAISE EXCEPTION 'Pendiente duplicado después de abrir NC.'; END IF;
    BEGIN
      PERFORM public.fn_crear_nc_desde_control(buena);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó NC de ejecución efectiva.';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%parcial o inefectivo%' THEN RAISE; END IF;
    END;

    INSERT INTO public.hallazgos(codigo,auditoria_id,titulo,descripcion,tipo,severidad,detectado_por_usuario_id,proceso_id,requisito_id,control_ejecucion_id)
      VALUES('HAL-2099-99999-001',auditoria,'TEST Evaluación faltante','Evidencia del control sin evaluación de proveedor','no_conformidad_menor','media',gestor,proceso,requisito,ejecucion) RETURNING id INTO hallazgo;
    IF public.fn_crear_nc_desde_hallazgo(hallazgo)<>nc THEN RAISE EXCEPTION 'El hallazgo duplicó la NC del control.'; END IF;
    INSERT INTO public.hallazgos(codigo,auditoria_id,titulo,descripcion,tipo,severidad,detectado_por_usuario_id,proceso_id,requisito_id,control_ejecucion_id)
      VALUES('HAL-2099-99999-002',auditoria,'TEST Evaluación parcial','Evaluación parcial detectada en auditoría','no_conformidad_menor','media',gestor,proceso,requisito,otra) RETURNING id INTO hallazgo2;
    nc_auditoria := public.fn_crear_nc_desde_hallazgo(hallazgo2);
    IF public.fn_crear_nc_desde_hallazgo(hallazgo2)<>nc_auditoria THEN RAISE EXCEPTION 'Conversión no idempotente.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.no_conformidades WHERE id=nc_auditoria AND hallazgo_id=hallazgo2 AND origen='auditoria_interna' AND control_ejecucion_id=otra) THEN
      RAISE EXCEPTION 'Falta origen de auditoría.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.hallazgos WHERE id=hallazgo2 AND no_conformidad_id=nc_auditoria AND estado='en_tratamiento') THEN
      RAISE EXCEPTION 'La conversión no sincronizó el hallazgo.'; END IF;
    UPDATE public.no_conformidades SET responsable_tratamiento_id=gestor,verificador_eficacia_id=verificador,
      fecha_limite_cierre=current_date+30,fecha_verificacion_prevista=current_date+20,
      analisis_causa_raiz='No se definió un responsable para validar proveedores antes de comprar.',metodo_analisis='cinco_porques' WHERE id=nc;
    UPDATE public.no_conformidades SET responsable_tratamiento_id=gestor,verificador_eficacia_id=verificador,
      fecha_limite_cierre=current_date+30,fecha_verificacion_prevista=current_date+20,
      analisis_causa_raiz='Faltaban criterios para completar la evaluación.',metodo_analisis='cinco_porques' WHERE id=nc_auditoria;
    PERFORM public.fn_pendientes_usuario(gestor);
    INSERT INTO public.acciones(titulo,descripcion,tipo,responsable_id,fecha_limite,no_conformidad_id)
      VALUES('TEST Criterio de aprobación','Establecer y aplicar criterios de evaluación de proveedores','correctiva',gestor,current_date+10,nc) RETURNING id INTO accion;
    BEGIN
      UPDATE public.acciones SET estado='completada',resultado_obtenido='Proveedor evaluado' WHERE id=accion;
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se completó sin evidencia.';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%resultado y evidencia%' THEN RAISE; END IF;
    END;
    UPDATE public.acciones SET estado='completada',resultado_obtenido='Proveedores aprobados antes de comprar',
      evidencia_descripcion='Muestra TEST: tres órdenes con evaluación aprobada' WHERE id=accion;
    SELECT revision_tratamiento INTO revision FROM public.no_conformidades WHERE id=nc;
    IF revision<3 THEN RAISE EXCEPTION 'No se versionó el tratamiento.'; END IF;
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc,gestor,'eficaz','Las acciones resultaron eficaces','Revisión de tres órdenes',ARRAY[accion]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó autoverificación.';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%independiente asignado%' THEN RAISE; END IF;
    END;
    SELECT * INTO resultado_cierre FROM public.fn_cerrar_nc(nc,'Cierre no permitido',true);
    IF resultado_cierre.cerrada THEN RAISE EXCEPTION 'Se aceptó cierre forzado.'; END IF;

    PERFORM set_config('request.jwt.claim.sub',auth_ajeno::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_ajeno,'role','authenticated')::text,true);
    IF EXISTS(SELECT 1 FROM public.no_conformidades WHERE id=nc) THEN RAISE EXCEPTION 'RLS expuso NC a usuario ajeno.'; END IF;
    UPDATE public.acciones SET resultado_obtenido='Cambio no autorizado' WHERE id=accion;
    GET DIAGNOSTICS filas=ROW_COUNT;
    IF filas<>0 THEN RAISE EXCEPTION 'RLS permitió modificar una acción ajena.'; END IF;
    BEGIN
      PERFORM public.fn_cerrar_nc(nc,'Cierre no autorizado',false);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Cierre no autorizado.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Sin permisos%' THEN RAISE; END IF; END;
    BEGIN
      PERFORM public.fn_pendientes_usuario(gestor);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Consulta de pendientes ajenos.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%pendientes propios%' THEN RAISE; END IF; END;

    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='verificaciones' AND entidad_id=nc) THEN
      RAISE EXCEPTION 'Falta pendiente del verificador.'; END IF;
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc,verificador,'eficaz','Revisión sin acciones seleccionadas','Muestra de órdenes revisada',ARRAY[]::uuid[]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó verificación sin acciones.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Seleccioná las acciones%' THEN RAISE; END IF; END;
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc,verificador,'eficaz','Intento sin evidencia revisada','',ARRAY[accion]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó verificación sin evidencia.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%evidencia revisada%' THEN RAISE; END IF; END;
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'eficaz','Se comprobó la eficacia en la muestra','Tres órdenes posteriores conformes',ARRAY[accion]);
    IF (public.fn_estado_tratamiento_nc(nc)->>'bloqueoCierre') IS NOT NULL THEN RAISE EXCEPTION 'Se bloqueó eficacia válida.'; END IF;
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'no_eficaz','Nueva muestra presenta incumplimientos','Orden posterior sin aprobación',ARRAY[accion]);
    SELECT * INTO resultado_cierre FROM public.fn_cerrar_nc(nc,'No puede usar una eficacia antigua',false);
    IF resultado_cierre.cerrada THEN RAISE EXCEPTION 'Se usó eficacia antigua después de resultado negativo.'; END IF;
    IF (SELECT revision_tratamiento FROM public.no_conformidades WHERE id=nc)<>revision THEN RAISE EXCEPTION 'Verificar no debe editar el tratamiento.'; END IF;

    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='tratamiento' AND entidad_id=nc) THEN
      RAISE EXCEPTION 'Falta pendiente de revisión después de ineficacia.'; END IF;
    UPDATE public.acciones SET resultado_obtenido='Criterio corregido y aplicado',evidencia_descripcion='Cinco órdenes posteriores aprobadas TEST' WHERE id=accion;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'eficaz','Cinco órdenes posteriores cumplen el criterio','Revisión de las cinco órdenes TEST',ARRAY[accion]);
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    UPDATE public.no_conformidades SET analisis_causa_raiz='Causa corregida: el circuito no exigía evidencia antes de emitir la orden.' WHERE id=nc;
    SELECT * INTO resultado_cierre FROM public.fn_cerrar_nc(nc,'No puede usar evidencia anterior al cambio',false);
    IF resultado_cierre.cerrada OR resultado_cierre.mensaje NOT LIKE '%tratamiento cambió%' THEN RAISE EXCEPTION 'El cambio de causa no invalidó eficacia.'; END IF;
    INSERT INTO public.acciones(titulo,descripcion,tipo,responsable_id,fecha_limite,no_conformidad_id)
      VALUES('TEST Acción adicional','Comprobar órdenes bloqueadas sin evaluación','mejora',gestor,current_date+10,nc) RETURNING id INTO accion_extra;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc_auditoria,verificador,'eficaz','Intento de acción de otra NC','Muestra TEST',ARRAY[accion]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó acción de otra NC.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%pertenecer a esta NC%' THEN RAISE; END IF; END;
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc,verificador,'eficaz','Quedan acciones pendientes','Muestra TEST',ARRAY[accion]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó eficacia con acciones pendientes.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%todas las acciones%' THEN RAISE; END IF; END;
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    UPDATE public.acciones SET estado='completada',resultado_obtenido='Bloqueo comprobado',evidencia_descripcion='Registro TEST del bloqueo de compra' WHERE id=accion_extra;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'eficaz','Tratamiento completo y eficaz verificado','Muestra y registro TEST de bloqueo conformes',ARRAY[accion,accion_extra]);
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='cierres' AND entidad_id=nc) THEN RAISE EXCEPTION 'Falta pendiente de cierre.'; END IF;
    SELECT * INTO resultado_cierre FROM public.fn_cerrar_nc(nc,'Eficacia independiente comprobada; cierre del tratamiento TEST',false);
    IF NOT resultado_cierre.cerrada THEN RAISE EXCEPTION 'No pudo cerrarse: %',resultado_cierre.mensaje; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.hallazgos WHERE id=hallazgo AND estado='cerrado' AND no_conformidad_id=nc) THEN RAISE EXCEPTION 'Cierre no sincronizado con auditoría.'; END IF;
    IF EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE entidad_id=nc) THEN RAISE EXCEPTION 'Persisten pendientes de NC cerrada.'; END IF;
    BEGIN
      UPDATE public.acciones SET evidencia_descripcion='Cambio posterior al cierre' WHERE id=accion;
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se editó tratamiento cerrado.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%ya está cerrado%' THEN RAISE; END IF; END;
    IF has_function_privilege('anon','public.fn_crear_nc_desde_control(uuid)','EXECUTE')
      OR has_table_privilege('authenticated','public.verificaciones_eficacia','UPDATE')
      OR has_function_privilege('authenticated','public.fn_pendientes_usuario_fase2(uuid,text)','EXECUTE') THEN
      RAISE EXCEPTION 'Privilegios inseguros.'; END IF;
    EXECUTE format('SET LOCAL ROLE %I',rol_original);
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='PRUEBAS_FASE3_OK_ROLLBACK';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'FASE3 OK: trazabilidad Compras ISO9001, idempotencia, RLS, segregación, revisiones, pendientes y cierre. Fixtures revertidos.';
  END;
END;
$test$;
