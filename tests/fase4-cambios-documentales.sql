-- Integración con identidades autenticadas; todos los fixtures revierten.
-- El archivo es metadata SQL de prueba, no una carga real a Storage.
DO $test$
DECLARE
  gestor uuid; auth_gestor uuid; verificador uuid; auth_verificador uuid; ajeno uuid; auth_ajeno uuid;
  proceso uuid; requisito uuid; norma uuid; riesgo uuid; documento uuid;
  doc uuid; v_version uuid; accion uuid; nc uuid; firma uuid; acuse record;
  fecha_firma timestamptz; cierre record; aprobacion record; filas integer; rol_original text:=current_user;
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


    INSERT INTO public.documentos(codigo,titulo,tipo_documental_id,proceso_principal_id,dueno_usuario_id,requiere_acuse_lectura,creado_por)
      SELECT 'PR-CMP-99-999','TEST FASE4 Evaluación de proveedores',tipo_documental_id,proceso,gestor,true,gestor
      FROM public.documentos WHERE id=documento RETURNING id INTO doc;
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.no_conformidades(titulo,descripcion,origen,proceso_id,requisito_id,responsable_tratamiento_id,
      verificador_eficacia_id,fecha_limite_cierre,fecha_verificacion_prevista,analisis_causa_raiz,metodo_analisis)
      VALUES('TEST FASE4 Compras','Falta criterio documental para evaluar proveedores','control_interno',proceso,requisito,gestor,
        verificador,current_date+30,current_date+20,'El procedimiento no definía la evidencia necesaria antes de comprar.','cinco_porques')
      RETURNING id INTO nc;
    INSERT INTO public.acciones(titulo,descripcion,tipo,responsable_id,fecha_limite,no_conformidad_id,requiere_cambio_documental)
      VALUES('TEST Actualizar procedimiento','Incorporar evaluación obligatoria y evidencia previa a emitir la orden','correctiva',gestor,current_date+10,nc,true)
      RETURNING id INTO accion;
    BEGIN
      UPDATE public.acciones SET estado='completada',resultado_obtenido='Procedimiento actualizado',evidencia_descripcion='Versión de prueba revisada' WHERE id=accion;
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se completó sin versión vinculada.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Falta vincular%' THEN RAISE; END IF; END;
    v_version := public.fn_crear_borrador_accion(accion,doc);
    IF public.fn_crear_borrador_accion(accion,doc)<>v_version THEN RAISE EXCEPTION 'Se duplicó el borrador.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.acciones WHERE id=accion AND version_documento_resultante_id=v_version AND requiere_lecturas_documentales) THEN
      RAISE EXCEPTION 'El borrador no quedó vinculado con lecturas requeridas.'; END IF;
    UPDATE public.acciones SET requiere_lecturas_documentales=false WHERE id=accion;
    IF NOT EXISTS(SELECT 1 FROM public.acciones WHERE id=accion AND requiere_lecturas_documentales) THEN
      RAISE EXCEPTION 'Se pudo desactivar la lectura obligatoria de la acción.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.versiones WHERE id=v_version AND creado_por=gestor AND motivo_cambio LIKE 'ACC-%') THEN
      RAISE EXCEPTION 'Falta actor u origen en el borrador.'; END IF;
    BEGIN
      UPDATE public.acciones SET estado='completada',resultado_obtenido='Documento listo',evidencia_descripcion='Borrador de procedimiento TEST' WHERE id=accion;
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se completó con borrador no aprobado.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%aprobada y vigente%' THEN RAISE; END IF; END;
    INSERT INTO public.archivos(version_id,tipo_archivo,nombre_original,mime_type,extension,"tamaño_bytes",storage_bucket,storage_path,hash_sha256,estado_procesamiento,creado_por)
      VALUES(v_version,'principal','TEST.pdf','application/pdf','pdf',20,'documentos-principales',doc::text||'/TEST-F4.pdf',repeat('a',64),'completado',gestor);
    SELECT * INTO aprobacion FROM public.fn_aprobar_documento_admin(doc,'Aprobación administrativa de fixture TEST; revierte al finalizar');
    IF NOT aprobacion.aprobado THEN RAISE EXCEPTION 'No pudo aprobarse el fixture: %',aprobacion.mensaje; END IF;
    -- Si el proceso no tiene lectores, se verifica el bloqueo y se distribuye
    -- explícitamente al verificador, usando el mecanismo de acuses existente.
    IF NOT EXISTS(SELECT 1 FROM public.acuses_lectura WHERE acuses_lectura.version_id=v_version) THEN
      IF NOT EXISTS(SELECT 1 FROM public.fn_cambios_documentales_nc(nc) WHERE bloqueo_eficacia LIKE '%destinatarios%') THEN
        RAISE EXCEPTION 'No se bloqueó una distribución vacía.'; END IF;
      INSERT INTO public.acuses_lectura(version_id,usuario_id,origen) VALUES(v_version,verificador,'manual_admin');
    END IF;
    UPDATE public.acciones SET estado='completada',resultado_obtenido='Procedimiento aprobado',
      evidencia_descripcion='Versión resultante aprobada administrativamente en fixture TEST' WHERE id=accion;
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='documentacion' AND entidad_id=nc) THEN
      RAISE EXCEPTION 'Falta pendiente documental del responsable.'; END IF;
    PERFORM set_config('request.jwt.claim.sub',auth_ajeno::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_ajeno,'role','authenticated')::text,true);
    UPDATE public.acciones SET requiere_cambio_documental=false,version_documento_resultante_id=NULL WHERE id=accion;
    GET DIAGNOSTICS filas=ROW_COUNT;
    IF filas<>0 THEN RAISE EXCEPTION 'RLS permitió modificar el cambio documental ajeno.'; END IF;
    BEGIN
      PERFORM public.fn_cambios_documentales_nc(nc);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='RPC expuso lecturas de una NC ajena.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Sin acceso%' THEN RAISE; END IF; END;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    IF EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='verificaciones' AND entidad_id=nc) THEN
      RAISE EXCEPTION 'Se solicitó eficacia antes de terminar las lecturas.'; END IF;
    BEGIN
      INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
        VALUES(nc,verificador,'eficaz','Intento con lecturas pendientes','Revisión documental TEST',ARRAY[accion]);
      RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Se aceptó eficacia con lecturas pendientes.';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%lecturas obligatorias pendientes%' THEN RAISE; END IF; END;
    EXECUTE format('SET LOCAL ROLE %I',rol_original);
    FOR acuse IN SELECT ac.id,ac.usuario_id,u.auth_user_id FROM public.acuses_lectura ac JOIN public.usuarios u ON u.id=ac.usuario_id
      WHERE ac.version_id=v_version AND ac.fecha_acuse IS NULL LOOP
      PERFORM set_config('request.jwt.claim.sub',acuse.auth_user_id::text,true);
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',acuse.auth_user_id,'role','authenticated')::text,true);
      SET LOCAL ROLE authenticated;
      fecha_firma := clock_timestamp();
      INSERT INTO public.firmas_electronicas(entidad_tipo,entidad_id,usuario_id,hash_documento_firmado,metodo_autenticacion,timestamp_firma)
        VALUES('acuse_lectura',acuse.id,acuse.usuario_id,repeat('a',64),'supabase_password',fecha_firma) RETURNING id INTO firma;
      UPDATE public.acuses_lectura SET fecha_acuse=fecha_firma,firma_id=firma WHERE id=acuse.id;
      EXECUTE format('SET LOCAL ROLE %I',rol_original);
    END LOOP;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='verificaciones' AND entidad_id=nc) THEN
      RAISE EXCEPTION 'Falta pendiente de eficacia después de completar las lecturas.'; END IF;
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'eficaz','Cambio documental implementado y comunicado','Versión aprobada y lecturas firmadas TEST',ARRAY[accion]);
    IF (public.fn_estado_tratamiento_nc(nc)->>'bloqueoCierre') IS NOT NULL THEN RAISE EXCEPTION 'Cierre válido bloqueado.'; END IF;
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    UPDATE public.archivos SET hash_sha256=repeat('b',64) WHERE archivos.version_id=v_version AND tipo_archivo='principal';
    SELECT * INTO cierre FROM public.fn_cerrar_nc(nc,'No debe cerrar con un archivo diferente del leído',false);
    IF cierre.cerrada OR cierre.mensaje NOT LIKE '%lecturas obligatorias pendientes%' THEN
      RAISE EXCEPTION 'Se aceptaron firmas de otro contenido.'; END IF;
    UPDATE public.archivos SET hash_sha256=repeat('a',64) WHERE archivos.version_id=v_version AND tipo_archivo='principal';
    UPDATE public.versiones SET resumen_cambios='Cambio posterior a la verificación TEST' WHERE id=v_version;
    SELECT * INTO cierre FROM public.fn_cerrar_nc(nc,'No debe usar una verificación anterior al cambio documental',false);
    IF cierre.cerrada OR cierre.mensaje NOT LIKE '%documentación o sus lecturas cambiaron%' THEN
      RAISE EXCEPTION 'No se invalidó la verificación por cambio documental: %',cierre.mensaje; END IF;
    IF EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='cierres' AND entidad_id=nc) THEN RAISE EXCEPTION 'Pendiente de cierre inválido.'; END IF;
    PERFORM set_config('request.jwt.claim.sub',auth_verificador::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_verificador,'role','authenticated')::text,true);
    IF NOT EXISTS(SELECT 1 FROM public.fn_pendientes_mejora() WHERE modulo='verificaciones' AND entidad_id=nc) THEN RAISE EXCEPTION 'Falta nueva verificación documental.'; END IF;
    INSERT INTO public.verificaciones_eficacia(no_conformidad_id,verificador_usuario_id,resultado,conclusion,evidencia_revisada,acciones_verificadas)
      VALUES(nc,verificador,'eficaz','Cambios posteriores nuevamente verificados','Versión y lecturas actuales revisadas TEST',ARRAY[accion]);
    PERFORM set_config('request.jwt.claim.sub',auth_gestor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',auth_gestor,'role','authenticated')::text,true);
    SELECT * INTO cierre FROM public.fn_cerrar_nc(nc,'Cierre con aprobación y lecturas verificadas',false);
    IF NOT cierre.cerrada THEN RAISE EXCEPTION 'No se completó el circuito: %',cierre.mensaje; END IF;
    IF has_function_privilege('anon','public.fn_crear_borrador_accion(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC de creación accesible sin autenticación.'; END IF;
    EXECUTE format('SET LOCAL ROLE %I',rol_original);
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FASE4_OK_ROLLBACK';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN RAISE NOTICE 'FASE4 OK: borrador, aprobación, lecturas, eficacia, RLS y cierre; fixtures revertidos.';
  END;
END;
$test$;
