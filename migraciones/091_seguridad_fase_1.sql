-- SGI Multinorma - Fase 1 de seguridad
-- Cierra escalaciones de privilegios en RPC, acceso anonimo a datos internos
-- y borrado transversal de evidencias en Storage.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.fn_usuario_es_gestor_sgi()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.asignaciones_rol_global a
    JOIN public.roles_globales r ON r.id = a.rol_id
    JOIN public.usuarios u ON u.id = a.usuario_id
    WHERE u.auth_user_id = auth.uid()
      AND u.activo = true
      AND r.activo = true
      AND r.codigo IN ('admin', 'responsable_sgi', 'superadmin')
      AND a.vigente_hasta IS NULL
  );
$function$;

REVOKE ALL ON FUNCTION private.fn_usuario_es_gestor_sgi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fn_usuario_es_gestor_sgi() TO authenticated, service_role;

-- La aprobacion administrativa es una excepcion al circuito formal. Solo SGI.
CREATE OR REPLACE FUNCTION public.fn_aprobar_documento_admin(
  p_documento_id uuid,
  p_motivo text
)
RETURNS TABLE(aprobado boolean, version_id uuid, mensaje text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_usuario uuid;
  v_version_id uuid;
  v_estado_doc text;
BEGIN
  v_usuario := public.fn_current_user_id();
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Sesion no valida.';
  END IF;
  IF NOT private.fn_usuario_es_gestor_sgi() THEN
    RAISE EXCEPTION 'Solo un administrador o responsable del SGI puede aprobar administrativamente.';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'El motivo de la aprobacion administrativa es obligatorio (minimo 5 caracteres).';
  END IF;

  SELECT d.estado_actual INTO v_estado_doc
  FROM public.documentos d
  WHERE d.id = p_documento_id AND d.eliminado_en IS NULL
  FOR UPDATE;

  IF v_estado_doc IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Documento no encontrado.'; RETURN;
  END IF;
  IF v_estado_doc = 'obsoleto' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'El documento esta obsoleto; no se puede aprobar.'; RETURN;
  END IF;

  SELECT v.id INTO v_version_id
  FROM public.versiones v
  WHERE v.documento_id = p_documento_id
    AND v.eliminado_en IS NULL
    AND v.activo = true
  ORDER BY v.numero_orden DESC
  LIMIT 1
  FOR UPDATE;

  IF v_version_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'El documento no tiene versiones para aprobar.'; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.versiones WHERE id = v_version_id AND es_vigente = true) THEN
    RETURN QUERY SELECT true, v_version_id, 'La version ya estaba vigente.'; RETURN;
  END IF;

  UPDATE public.versiones
  SET es_vigente = false,
      estado = 'obsoleto',
      fecha_vigencia_hasta = current_date
  WHERE documento_id = p_documento_id
    AND id <> v_version_id
    AND es_vigente = true;

  UPDATE public.versiones
  SET estado = 'aprobado',
      es_vigente = true,
      fecha_aprobado = COALESCE(fecha_aprobado, now()),
      fecha_vigencia_desde = COALESCE(fecha_vigencia_desde, current_date),
      motivo_cambio = COALESCE(NULLIF(motivo_cambio, ''), '') ||
        CASE WHEN COALESCE(motivo_cambio, '') = '' THEN '' ELSE ' | ' END ||
        'Aprobacion administrativa: ' || trim(p_motivo)
  WHERE id = v_version_id;

  UPDATE public.documentos
  SET version_vigente_id = v_version_id,
      estado_actual = 'aprobado',
      actualizado_en = now(),
      actualizado_por = v_usuario
  WHERE id = p_documento_id;

  RETURN QUERY SELECT true, v_version_id, 'Documento aprobado y puesto vigente.';
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_aprobar_documento_admin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_aprobar_documento_admin(uuid, text) TO authenticated, service_role;

-- Reabrir una version queda limitado a gestores, dueno, creador o responsables
-- del proceso. La autorizacion se valida otra vez en base, no solo en la UI.
CREATE OR REPLACE FUNCTION public.fn_reabrir_version_rechazada(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
  v_estado public.documento_estado_enum;
  v_doc uuid;
  v_creado_por uuid;
  v_dueno uuid;
  v_proceso uuid;
BEGIN
  v_actor := public.fn_current_user_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Sesion no valida.'; END IF;

  SELECT v.estado, v.documento_id, v.creado_por,
         d.dueno_usuario_id, d.proceso_principal_id
  INTO v_estado, v_doc, v_creado_por, v_dueno, v_proceso
  FROM public.versiones v
  JOIN public.documentos d ON d.id = v.documento_id
  WHERE v.id = p_version_id
    AND v.eliminado_en IS NULL
    AND d.eliminado_en IS NULL
  FOR UPDATE OF v, d;

  IF v_estado IS NULL THEN RAISE EXCEPTION 'Version no encontrada.'; END IF;
  IF v_estado <> 'rechazado' THEN
    RAISE EXCEPTION 'Solo se puede reabrir una version rechazada (estado actual: %).', v_estado;
  END IF;
  IF NOT (
    private.fn_usuario_es_gestor_sgi()
    OR v_actor = v_creado_por
    OR v_actor = v_dueno
    OR public.fn_usuario_participa_en_proceso(v_proceso, 'elaborador'::public.rol_proceso_enum)
    OR public.fn_usuario_participa_en_proceso(v_proceso, 'responsable_proceso'::public.rol_proceso_enum)
  ) THEN
    RAISE EXCEPTION 'No tenes permisos para reabrir esta version.';
  END IF;

  UPDATE public.aprobaciones
  SET decision_n1 = 'pendiente', fecha_decision_n1 = NULL, comentario_n1 = NULL,
      decision_n2 = 'pendiente', fecha_decision_n2 = NULL, comentario_n2 = NULL,
      cerrada_en = NULL
  WHERE version_id = p_version_id;

  UPDATE public.versiones
  SET estado = 'borrador', fecha_rechazado = NULL
  WHERE id = p_version_id;

  UPDATE public.documentos
  SET estado_actual = 'borrador', actualizado_en = now(), actualizado_por = v_actor
  WHERE id = v_doc AND version_vigente_id IS DISTINCT FROM p_version_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_reabrir_version_rechazada(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reabrir_version_rechazada(uuid) TO authenticated, service_role;

-- Procesamiento de fragmentos: solo backend con service role y relaciones
-- archivo/version consistentes. El actor debe existir y estar activo.
CREATE OR REPLACE FUNCTION public.fn_guardar_fragmentos_version(
  p_version_id uuid,
  p_archivo_id uuid,
  p_fragmentos jsonb,
  p_actor_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
  v_prev integer;
  v_cant integer;
  v_doc uuid;
BEGIN
  v_actor := COALESCE(p_actor_id, public.fn_usuario_id_actual());
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id = v_actor AND u.activo = true
  ) THEN
    RAISE EXCEPTION 'Actor inexistente o inactivo.';
  END IF;
  IF jsonb_typeof(p_fragmentos) <> 'array' THEN
    RAISE EXCEPTION 'Los fragmentos deben enviarse como un arreglo JSON.';
  END IF;

  SELECT v.documento_id INTO v_doc
  FROM public.versiones v
  WHERE v.id = p_version_id AND v.eliminado_en IS NULL;
  IF v_doc IS NULL THEN RAISE EXCEPTION 'Version % inexistente.', p_version_id; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.archivos a
    WHERE a.id = p_archivo_id
      AND a.version_id = p_version_id
      AND a.contexto = 'documento'
      AND a.activo = true
      AND a.eliminado_en IS NULL
  ) THEN
    RAISE EXCEPTION 'El archivo no pertenece a la version indicada.';
  END IF;

  SELECT count(*) INTO v_prev
  FROM public.version_fragmentos
  WHERE version_id = p_version_id;

  IF v_prev > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.referencias_normativas r
      JOIN public.version_fragmentos f ON f.id = r.fragmento_id
      WHERE f.version_id = p_version_id
        AND r.estado = 'aceptado'
        AND r.eliminado_en IS NULL
    ) THEN
      RAISE EXCEPTION 'La version tiene referencias aceptadas; revisalas antes de reprocesar.';
    END IF;
    DELETE FROM public.referencias_normativas r
    USING public.version_fragmentos f
    WHERE f.id = r.fragmento_id AND f.version_id = p_version_id;
    DELETE FROM public.version_fragmentos WHERE version_id = p_version_id;
  END IF;

  INSERT INTO public.version_fragmentos (
    version_id, documento_id, archivo_id, orden, tipo, numeral, nivel,
    titulo, texto, pagina, hash_texto, creado_por
  )
  SELECT p_version_id, v_doc, p_archivo_id, x.orden,
         COALESCE(x.tipo, 'seccion')::public.fragmento_tipo_enum,
         NULLIF(btrim(x.numeral), ''), x.nivel, NULLIF(btrim(x.titulo), ''),
         x.texto, x.pagina, 'pendiente', v_actor
  FROM jsonb_to_recordset(p_fragmentos) AS x(
    orden integer, tipo text, numeral text, nivel integer,
    titulo text, texto text, pagina integer
  )
  WHERE length(btrim(x.texto)) > 0;

  GET DIAGNOSTICS v_cant = ROW_COUNT;
  INSERT INTO public.eventos_auditoria (
    timestamp_utc, usuario_id, usuario_email_snapshot, accion, entidad_tipo,
    entidad_id, descripcion, datos_antes, datos_despues, hash_propio
  )
  VALUES (
    now(), v_actor, (SELECT u.username FROM public.usuarios u WHERE u.id = v_actor),
    'crear', 'version_fragmentos', p_version_id,
    format('Extraccion de %s fragmentos de la version', v_cant), NULL,
    jsonb_build_object('version_id', p_version_id, 'archivo_id', p_archivo_id,
      'fragmentos', v_cant, 'reproceso', v_prev > 0),
    'placeholder_recalculado_por_trigger'
  );

  RETURN jsonb_build_object('ok', true, 'version_id', p_version_id,
    'fragmentos', v_cant, 'reproceso', v_prev > 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_guardar_fragmentos_version(uuid, uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_guardar_fragmentos_version(uuid, uuid, jsonb, uuid)
  TO service_role;

-- El calendario deja de confiar en un usuario recibido desde el navegador.
ALTER FUNCTION public.fn_calendario_eventos(uuid, date, date, text, text)
  RENAME TO fn_calendario_eventos_interno;
REVOKE ALL ON FUNCTION public.fn_calendario_eventos_interno(uuid, date, date, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.fn_calendario_eventos(
  p_usuario_id uuid,
  p_desde date,
  p_hasta date,
  p_scope text DEFAULT 'personal',
  p_zona text DEFAULT 'America/Argentina/Buenos_Aires'
)
RETURNS TABLE(
  modulo text, entidad_id uuid, codigo text, titulo text, fecha_evento date,
  dias_restantes integer, nivel text, url_destino text, proceso_id uuid,
  origen_tabla text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_usuario uuid;
BEGIN
  v_usuario := public.fn_usuario_id_actual();
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Sesion no valida.'; END IF;
  IF p_usuario_id IS DISTINCT FROM v_usuario
     AND NOT private.fn_usuario_es_gestor_sgi() THEN
    RAISE EXCEPTION 'No tenes permisos para consultar el calendario de otro usuario.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.fn_calendario_eventos_interno(
    p_usuario_id, p_desde, p_hasta, p_scope, p_zona
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_calendario_eventos(uuid, date, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_calendario_eventos(uuid, date, date, text, text)
  TO authenticated, service_role;

-- Estas lecturas deben obedecer la RLS de la entidad de origen.
ALTER FUNCTION public.fn_trazabilidad_nc(uuid) SECURITY INVOKER;
ALTER FUNCTION public.fn_trazabilidad_hallazgo(uuid) SECURITY INVOKER;
ALTER FUNCTION public.fn_trazabilidad_auditoria(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.fn_trazabilidad_nc(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_trazabilidad_hallazgo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_trazabilidad_auditoria(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_trazabilidad_nc(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_trazabilidad_hallazgo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_trazabilidad_auditoria(uuid) TO authenticated, service_role;

ALTER VIEW public.v_correo_salud SET (security_invoker = true);

-- Cerrar toda la superficie anonima del SGI. Auth funciona por auth.*, no por
-- grants anonimos sobre las tablas internas de public.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Jobs y operaciones internas no son acciones de cualquier usuario logueado.
REVOKE EXECUTE ON FUNCTION public.fn_correo_conciliar() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_correo_despachar(text, text, text, text, public.origen_correo, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_correo_reintentar() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_procesar_acciones_vencidas() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_procesar_correos_pendientes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_procesar_vencimientos() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_procesar_fragmentos_al_vigente() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_registrar_actor_transicion() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_correo_conciliar() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_correo_despachar(text, text, text, text, public.origen_correo, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_correo_reintentar() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_procesar_acciones_vencidas() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_procesar_correos_pendientes() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_procesar_vencimientos() TO service_role;

-- Las politicas sin TO aplicaban tambien al rol anon. El SGI es interno.
DO $block$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND 'public' = ANY(roles)
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated',
      p.policyname, p.schemaname, p.tablename
    );
  END LOOP;
END;
$block$;

-- Archivos: autorizacion segun entidad y validacion tanto antes como despues
-- de un UPDATE para evitar cambiar contexto o pertenencia.
DROP POLICY IF EXISTS archivos_insert ON public.archivos;
DROP POLICY IF EXISTS archivos_select ON public.archivos;
DROP POLICY IF EXISTS archivos_update ON public.archivos;

CREATE POLICY archivos_select ON public.archivos
FOR SELECT TO authenticated
USING (
  activo = true AND eliminado_en IS NULL AND (
    (contexto = 'documento' AND EXISTS (
      SELECT 1 FROM public.versiones v
      WHERE v.id = archivos.version_id
        AND public.fn_documento_es_visible_para_usuario(v.documento_id)
    ))
    OR (contexto IN ('evidencia_nc', 'adjunto_nc') AND EXISTS (
      SELECT 1 FROM public.no_conformidades nc
      WHERE nc.id = archivos.no_conformidad_id
    ))
    OR (contexto = 'adjunto_hallazgo' AND EXISTS (
      SELECT 1 FROM public.hallazgos h WHERE h.id = archivos.hallazgo_id
    ))
  )
);

CREATE POLICY archivos_insert ON public.archivos
FOR INSERT TO authenticated
WITH CHECK (
  creado_por = public.fn_usuario_id_actual() AND (
    (contexto = 'documento' AND EXISTS (
      SELECT 1
      FROM public.versiones v
      JOIN public.documentos d ON d.id = v.documento_id
      WHERE v.id = archivos.version_id
        AND (
          private.fn_usuario_es_gestor_sgi()
          OR v.creado_por = public.fn_usuario_id_actual()
          OR d.dueno_usuario_id = public.fn_usuario_id_actual()
          OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'elaborador')
          OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'responsable_proceso')
        )
    ))
    OR (contexto = 'evidencia_nc' AND private.fn_usuario_es_gestor_sgi())
    OR (contexto = 'adjunto_nc' AND EXISTS (
      SELECT 1 FROM public.no_conformidades nc
      WHERE nc.id = archivos.no_conformidad_id
        AND nc.creado_por = public.fn_usuario_id_actual()
    ))
    OR (contexto = 'adjunto_hallazgo' AND EXISTS (
      SELECT 1
      FROM public.hallazgos h
      JOIN public.auditorias a ON a.id = h.auditoria_id
      WHERE h.id = archivos.hallazgo_id
        AND a.estado = 'en_curso'
        AND (
          private.fn_usuario_es_gestor_sgi()
          OR public.fn_usuario_es_miembro_equipo_auditoria(a.id)
        )
    ))
  )
);

CREATE POLICY archivos_update ON public.archivos
FOR UPDATE TO authenticated
USING (
  private.fn_usuario_es_gestor_sgi()
  OR creado_por = public.fn_usuario_id_actual()
  OR (contexto = 'documento' AND EXISTS (
    SELECT 1
    FROM public.versiones v
    JOIN public.documentos d ON d.id = v.documento_id
    WHERE v.id = archivos.version_id
      AND (
        v.creado_por = public.fn_usuario_id_actual()
        OR d.dueno_usuario_id = public.fn_usuario_id_actual()
        OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'responsable_proceso')
      )
  ))
)
WITH CHECK (
  private.fn_usuario_es_gestor_sgi()
  OR creado_por = public.fn_usuario_id_actual()
  OR (contexto = 'documento' AND EXISTS (
    SELECT 1
    FROM public.versiones v
    JOIN public.documentos d ON d.id = v.documento_id
    WHERE v.id = archivos.version_id
      AND (
        v.creado_por = public.fn_usuario_id_actual()
        OR d.dueno_usuario_id = public.fn_usuario_id_actual()
        OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'responsable_proceso')
      )
  ))
);

-- Storage: leer solo objetos respaldados por una fila visible de archivos.
DROP POLICY IF EXISTS anexos_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS principales_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_aud_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_nc_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS anexos_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS principales_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_aud_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_nc_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_aud_delete_authenticated ON storage.objects;
DROP POLICY IF EXISTS evidencias_nc_delete_authenticated ON storage.objects;

CREATE POLICY sgi_objetos_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN (
    'documentos-anexos', 'documentos-principales',
    'evidencias-auditoria', 'evidencias-nc'
  )
  AND EXISTS (
    SELECT 1 FROM public.archivos a
    WHERE a.storage_bucket = storage.objects.bucket_id
      AND a.storage_path = storage.objects.name
      AND a.activo = true
      AND a.eliminado_en IS NULL
  )
);

CREATE POLICY sgi_objetos_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    (bucket_id IN ('documentos-anexos', 'documentos-principales') AND EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.id = split_part(storage.objects.name, '/', 1)::uuid
        AND d.activo = true AND d.eliminado_en IS NULL
        AND (
          private.fn_usuario_es_gestor_sgi()
          OR d.dueno_usuario_id = public.fn_usuario_id_actual()
          OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'elaborador')
          OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id, 'responsable_proceso')
        )
    ))
    OR (bucket_id = 'evidencias-nc' AND EXISTS (
      SELECT 1 FROM public.no_conformidades nc
      WHERE nc.id = split_part(storage.objects.name, '/', 1)::uuid
        AND nc.activo = true AND nc.eliminado_en IS NULL
        AND (
          private.fn_usuario_es_gestor_sgi()
          OR nc.creado_por = public.fn_usuario_id_actual()
          OR nc.responsable_tratamiento_id = public.fn_usuario_id_actual()
          OR public.fn_usuario_participa_en_proceso(nc.proceso_id, 'responsable_proceso')
        )
    ))
    OR (bucket_id = 'evidencias-auditoria' AND EXISTS (
      SELECT 1 FROM public.auditorias a
      WHERE a.id = split_part(storage.objects.name, '/', 1)::uuid
        AND a.activo = true AND a.eliminado_en IS NULL
        AND a.estado = 'en_curso'
        AND (
          private.fn_usuario_es_gestor_sgi()
          OR public.fn_usuario_es_miembro_equipo_auditoria(a.id)
        )
    ))
  )
);

-- Solo se limpian objetos huerfanos. Una evidencia activa nunca se borra por
-- la API de Storage; se da de baja mediante la fila auditada de archivos.
CREATE POLICY sgi_objetos_delete_huerfanos ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN (
    'documentos-anexos', 'documentos-principales',
    'evidencias-auditoria', 'evidencias-nc'
  )
  AND owner = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.archivos a
    WHERE a.storage_bucket = storage.objects.bucket_id
      AND a.storage_path = storage.objects.name
      AND a.activo = true
      AND a.eliminado_en IS NULL
  )
);

UPDATE storage.buckets
SET file_size_limit = 20 * 1024 * 1024
WHERE id IN ('evidencias-auditoria', 'evidencias-nc');

-- En futuros objetos la exposicion por Data API sera opt-in.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Guardas de la propia migracion.
DO $assert$
BEGIN
  IF has_function_privilege('anon', 'public.fn_guardar_fragmentos_version(uuid,uuid,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Fallo de seguridad: anon conserva fn_guardar_fragmentos_version';
  END IF;
  IF has_function_privilege('authenticated', 'public.fn_guardar_fragmentos_version(uuid,uuid,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Fallo de seguridad: authenticated conserva fn_guardar_fragmentos_version';
  END IF;
  IF has_function_privilege('authenticated', 'public.fn_correo_despachar(text,text,text,text,public.origen_correo,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Fallo de seguridad: authenticated conserva fn_correo_despachar';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND 'public' = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Fallo de seguridad: quedan politicas public en el esquema public';
  END IF;
END;
$assert$;

COMMIT;

