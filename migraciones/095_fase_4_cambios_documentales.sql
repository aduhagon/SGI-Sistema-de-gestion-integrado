BEGIN;

-- La política de aprobaciones consulta versiones. El chequeo del aprobador
-- se aísla para que UPDATE versiones no vuelva a entrar en su propia RLS.
CREATE FUNCTION private.fn_es_aprobador_version(p_version uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.fn_usuario_id_actual() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.aprobaciones a WHERE a.version_id=p_version
      AND (a.aprobador_n1_id=public.fn_usuario_id_actual() OR a.aprobador_n2_id=public.fn_usuario_id_actual()));
$$;
REVOKE ALL ON FUNCTION private.fn_es_aprobador_version(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fn_es_aprobador_version(uuid) TO authenticated;
DROP POLICY versiones_update_dueno_aprobador ON public.versiones;
CREATE POLICY versiones_update_dueno_aprobador ON public.versiones FOR UPDATE TO authenticated
USING (public.fn_usuario_es_auditor_o_sgi() OR creado_por=public.fn_usuario_id_actual()
  OR EXISTS(SELECT 1 FROM public.documentos d WHERE d.id=versiones.documento_id
    AND (d.dueno_usuario_id=public.fn_usuario_id_actual()
      OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id,'responsable_proceso')))
  OR private.fn_es_aprobador_version(id))
WITH CHECK (public.fn_usuario_es_auditor_o_sgi() OR creado_por=public.fn_usuario_id_actual()
  OR EXISTS(SELECT 1 FROM public.documentos d WHERE d.id=versiones.documento_id
    AND (d.dueno_usuario_id=public.fn_usuario_id_actual()
      OR public.fn_usuario_participa_en_proceso(d.proceso_principal_id,'responsable_proceso')))
  OR private.fn_es_aprobador_version(id));

ALTER TABLE public.acciones
  ADD COLUMN requiere_cambio_documental boolean NOT NULL DEFAULT false,
  ADD COLUMN version_documento_resultante_id uuid REFERENCES public.versiones(id) ON DELETE RESTRICT,
  ADD COLUMN requiere_lecturas_documentales boolean NOT NULL DEFAULT false;
ALTER TABLE public.verificaciones_eficacia ADD COLUMN contexto_documental jsonb;
CREATE INDEX idx_accion_version_resultante ON public.acciones(version_documento_resultante_id);

CREATE FUNCTION private.fn_bloqueo_version_documental(p_version uuid,p_lecturas boolean) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.versiones; d public.documentos;
BEGIN
  IF p_version IS NULL THEN RETURN 'Falta vincular la versión resultante.'; END IF;
  SELECT * INTO v FROM public.versiones WHERE id=p_version AND activo AND eliminado_en IS NULL;
  IF NOT FOUND THEN RETURN 'La versión vinculada no está disponible.'; END IF;
  SELECT * INTO d FROM public.documentos WHERE id=v.documento_id AND activo AND eliminado_en IS NULL;
  IF NOT FOUND THEN RETURN 'El documento vinculado no está disponible.'; END IF;
  IF v.estado<>'aprobado' OR NOT v.es_vigente OR d.version_vigente_id IS DISTINCT FROM v.id OR d.estado_actual<>'aprobado'
    OR v.fecha_vigencia_desde>current_date OR v.fecha_vigencia_hasta<current_date THEN
    RETURN 'La versión resultante debe estar aprobada y vigente.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.archivos WHERE version_id=v.id AND tipo_archivo='principal' AND activo AND eliminado_en IS NULL) THEN
    RETURN 'La versión resultante requiere su archivo principal.';
  END IF;
  IF p_lecturas THEN
    IF NOT EXISTS(SELECT 1 FROM public.acuses_lectura WHERE version_id=v.id) THEN
      RETURN 'No hay destinatarios de lectura para la versión resultante.';
    END IF;
    IF EXISTS(SELECT 1 FROM public.acuses_lectura a LEFT JOIN public.firmas_electronicas f ON f.id=a.firma_id
      WHERE a.version_id=v.id AND (a.fecha_acuse IS NULL OR f.id IS NULL OR f.firma_estado<>'vigente'
        OR NOT EXISTS(SELECT 1 FROM public.archivos ar WHERE ar.version_id=v.id AND ar.tipo_archivo='principal'
          AND ar.activo AND ar.eliminado_en IS NULL AND ar.hash_sha256=f.hash_documento_firmado))) THEN
      RETURN 'Quedan lecturas obligatorias pendientes de la versión resultante.';
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE FUNCTION private.fn_contexto_documental_nc(p_nc uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('accion',a.id,'version',v.id,'numero',v.numero_version,
    'estado',v.estado,'vigente',v.es_vigente,'aprobado_en',v.fecha_aprobado,'actualizado_en',v.actualizado_en,
    'motivo',v.motivo_cambio,'resumen',v.resumen_cambios,'desde',v.fecha_vigencia_desde,'hasta',v.fecha_vigencia_hasta,
    'hash',v.hash_archivo_principal,'version_vigente',d.version_vigente_id,'lecturas',a.requiere_lecturas_documentales OR d.requiere_acuse_lectura,
    'archivos',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',ar.id,'hash',ar.hash_sha256) ORDER BY ar.id),'[]'::jsonb)
      FROM public.archivos ar WHERE ar.version_id=v.id AND ar.activo AND ar.eliminado_en IS NULL),
    'acuses',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',ac.id,'fecha',ac.fecha_acuse,'firma',ac.firma_id,'estado',f.firma_estado) ORDER BY ac.id),'[]'::jsonb)
      FROM public.acuses_lectura ac LEFT JOIN public.firmas_electronicas f ON f.id=ac.firma_id WHERE ac.version_id=v.id)
  ) ORDER BY a.id),'[]'::jsonb)
  FROM public.acciones a LEFT JOIN public.versiones v ON v.id=a.version_documento_resultante_id
    LEFT JOIN public.documentos d ON d.id=v.documento_id
  WHERE a.no_conformidad_id=p_nc AND a.activo AND a.eliminado_en IS NULL AND a.estado<>'cancelada'
    AND a.requiere_cambio_documental AND private.fn_puede_ver_nc(p_nc);
$$;

CREATE FUNCTION private.fn_bloqueo_documental_nc(p_nc uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a record; motivo text;
BEGIN
  IF NOT private.fn_puede_ver_nc(p_nc) THEN RETURN 'Sin acceso al tratamiento.'; END IF;
  FOR a IN SELECT ac.*,d.requiere_acuse_lectura FROM public.acciones ac
    LEFT JOIN public.versiones v ON v.id=ac.version_documento_resultante_id
    LEFT JOIN public.documentos d ON d.id=v.documento_id
    WHERE ac.no_conformidad_id=p_nc AND ac.activo AND ac.eliminado_en IS NULL
      AND ac.estado<>'cancelada' AND ac.requiere_cambio_documental LOOP
    motivo := private.fn_bloqueo_version_documental(a.version_documento_resultante_id,
      a.requiere_lecturas_documentales OR coalesce(a.requiere_acuse_lectura,false));
    IF motivo IS NOT NULL THEN RETURN a.codigo||': '||motivo; END IF;
  END LOOP;
  RETURN NULL;
END; $$;

CREATE FUNCTION private.fn_integridad_cambio_documental() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.versiones; d public.documentos; motivo text;
BEGIN
  IF NOT NEW.requiere_cambio_documental THEN
    IF NEW.version_documento_resultante_id IS NOT NULL THEN RAISE EXCEPTION 'La versión requiere marcar cambio documental.'; END IF;
    NEW.requiere_lecturas_documentales := false;
    RETURN NEW;
  END IF;
  IF NEW.no_conformidad_id IS NULL THEN RAISE EXCEPTION 'El cambio documental requiere una NC.'; END IF;
  IF NEW.version_documento_resultante_id IS NOT NULL THEN
    SELECT * INTO STRICT v FROM public.versiones WHERE id=NEW.version_documento_resultante_id AND activo AND eliminado_en IS NULL;
    SELECT * INTO STRICT d FROM public.documentos WHERE id=v.documento_id AND activo AND eliminado_en IS NULL;
    IF NOT (public.fn_usuario_es_auditor_o_sgi() OR public.fn_documento_es_visible_para_usuario(d.id)) THEN
      RAISE EXCEPTION 'Sin acceso al documento resultante.';
    END IF;
    NEW.requiere_lecturas_documentales := d.requiere_acuse_lectura OR
      CASE WHEN TG_OP='UPDATE' AND NEW.version_documento_resultante_id IS NOT DISTINCT FROM OLD.version_documento_resultante_id
        THEN OLD.requiere_lecturas_documentales ELSE false END;
  ELSE
    NEW.requiere_lecturas_documentales := false;
  END IF;
  IF NEW.estado='completada' THEN
    motivo := private.fn_bloqueo_version_documental(NEW.version_documento_resultante_id,false);
    IF motivo IS NOT NULL THEN RAISE EXCEPTION '%',motivo; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER b_fase4_integridad_documental BEFORE INSERT OR UPDATE ON public.acciones
FOR EACH ROW EXECUTE FUNCTION private.fn_integridad_cambio_documental();

CREATE FUNCTION private.fn_verificacion_documental() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE motivo text;
BEGIN
  IF NEW.resultado='eficaz' THEN
    motivo := private.fn_bloqueo_documental_nc(NEW.no_conformidad_id);
    IF motivo IS NOT NULL THEN RAISE EXCEPTION '%',motivo; END IF;
  END IF;
  NEW.contexto_documental := private.fn_contexto_documental_nc(NEW.no_conformidad_id);
  RETURN NEW;
END; $$;
-- Se ejecuta después de la validación de identidad y segregación de fase 3.
CREATE TRIGGER zz_fase4_verificacion_documental BEFORE INSERT ON public.verificaciones_eficacia
FOR EACH ROW EXECUTE FUNCTION private.fn_verificacion_documental();

ALTER FUNCTION private.fn_motivo_bloqueo_cierre(uuid) RENAME TO fn_motivo_bloqueo_cierre_fase3;
CREATE FUNCTION private.fn_motivo_bloqueo_cierre(p_nc uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE motivo text; contexto jsonb;
BEGIN
  IF NOT private.fn_puede_ver_nc(p_nc) THEN RETURN 'Sin acceso al tratamiento.'; END IF;
  motivo := private.fn_motivo_bloqueo_cierre_fase3(p_nc);
  IF motivo IS NOT NULL THEN RETURN motivo; END IF;
  motivo := private.fn_bloqueo_documental_nc(p_nc);
  IF motivo IS NOT NULL THEN RETURN motivo; END IF;
  SELECT contexto_documental INTO contexto FROM public.verificaciones_eficacia WHERE no_conformidad_id=p_nc
    ORDER BY fecha_verificacion DESC,id DESC LIMIT 1;
  IF coalesce(contexto,'[]'::jsonb) IS DISTINCT FROM private.fn_contexto_documental_nc(p_nc) THEN
    RETURN 'La documentación o sus lecturas cambiaron después de verificar. Verificá nuevamente.';
  END IF;
  RETURN NULL;
END; $$;

CREATE FUNCTION public.fn_crear_borrador_accion(p_accion uuid,p_documento uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.acciones; v_id uuid; orden integer;
BEGIN
  IF public.fn_usuario_id_actual() IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  SELECT * INTO STRICT a FROM public.acciones WHERE id=p_accion AND activo AND eliminado_en IS NULL FOR UPDATE;
  IF NOT (private.fn_puede_tratar_nc(a.no_conformidad_id) OR a.responsable_id=public.fn_usuario_id_actual()) THEN RAISE EXCEPTION 'Sin permisos sobre la acción.'; END IF;
  IF a.estado IN ('completada','cancelada') THEN RAISE EXCEPTION 'La acción ya está completada o cancelada.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('documento:'||p_documento::text,0));
  IF a.version_documento_resultante_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.versiones WHERE id=a.version_documento_resultante_id AND documento_id=p_documento
      AND estado='borrador' AND activo AND eliminado_en IS NULL;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
    RAISE EXCEPTION 'La acción ya tiene una versión vinculada. Revisá esa versión antes de crear otra.';
  END IF;
  SELECT coalesce(max(numero_orden),0)+1 INTO orden FROM public.versiones WHERE documento_id=p_documento;
  INSERT INTO public.versiones(documento_id,numero_orden,numero_version,estado,es_vigente,motivo_cambio,creado_por)
    VALUES(p_documento,orden,orden::text||'.0','borrador',false,a.codigo||': '||a.titulo||E'\n'||a.descripcion,public.fn_usuario_id_actual())
    RETURNING id INTO v_id;
  UPDATE public.acciones SET requiere_cambio_documental=true,version_documento_resultante_id=v_id WHERE id=a.id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.fn_cambios_documentales_nc(p_nc uuid) RETURNS TABLE(
  accion_id uuid,bloqueo_completar text,bloqueo_eficacia text,lecturas_total bigint,lecturas_pendientes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT private.fn_puede_ver_nc(p_nc) THEN RAISE EXCEPTION 'Sin acceso a la NC.'; END IF;
  RETURN QUERY SELECT a.id,
    private.fn_bloqueo_version_documental(a.version_documento_resultante_id,false),
    private.fn_bloqueo_version_documental(a.version_documento_resultante_id,a.requiere_lecturas_documentales OR coalesce(d.requiere_acuse_lectura,false)),
    (SELECT count(*) FROM public.acuses_lectura WHERE version_id=v.id),
    (SELECT count(*) FROM public.acuses_lectura ac LEFT JOIN public.firmas_electronicas f ON f.id=ac.firma_id
      WHERE ac.version_id=v.id AND (ac.fecha_acuse IS NULL OR f.id IS NULL OR f.firma_estado<>'vigente'
        OR NOT EXISTS(SELECT 1 FROM public.archivos ar WHERE ar.version_id=v.id AND ar.tipo_archivo='principal'
          AND ar.activo AND ar.eliminado_en IS NULL AND ar.hash_sha256=f.hash_documento_firmado)))
    FROM public.acciones a LEFT JOIN public.versiones v ON v.id=a.version_documento_resultante_id
      LEFT JOIN public.documentos d ON d.id=v.documento_id
    WHERE a.no_conformidad_id=p_nc AND a.activo AND a.eliminado_en IS NULL AND a.requiere_cambio_documental;
END; $$;

REVOKE ALL ON FUNCTION private.fn_bloqueo_version_documental(uuid,boolean),private.fn_contexto_documental_nc(uuid),
  private.fn_bloqueo_documental_nc(uuid),private.fn_integridad_cambio_documental(),private.fn_verificacion_documental(),
  private.fn_motivo_bloqueo_cierre(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.fn_contexto_documental_nc(uuid),private.fn_bloqueo_documental_nc(uuid),
  private.fn_motivo_bloqueo_cierre(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_crear_borrador_accion(uuid,uuid),public.fn_cambios_documentales_nc(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_crear_borrador_accion(uuid,uuid),public.fn_cambios_documentales_nc(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_pendientes_mejora(p_zona text DEFAULT 'America/Argentina/Buenos_Aires')
RETURNS TABLE(modulo text,entidad_id uuid,codigo text,titulo text,fecha_limite date,dias_restantes integer,nivel text,url_destino text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH base AS (
    SELECT 'tratamiento'::text modulo,n.id entidad_id,n.codigo,
      CASE WHEN n.responsable_tratamiento_id IS NULL OR n.fecha_limite_cierre IS NULL OR n.verificador_eficacia_id IS NULL OR n.fecha_verificacion_prevista IS NULL
        THEN 'Planificar tratamiento: ' ELSE 'Completar causa y acciones: ' END||n.titulo titulo,
      n.fecha_limite_cierre fecha_limite,'/ncs/'||n.id::text url_destino
    FROM public.no_conformidades n WHERE n.activo AND n.eliminado_en IS NULL AND n.estado NOT IN ('cerrada','aceptado_riesgo')
      AND (n.responsable_tratamiento_id=public.fn_usuario_id_actual() OR (n.responsable_tratamiento_id IS NULL AND private.fn_usuario_es_gestor_sgi()))
      AND (n.responsable_tratamiento_id IS NULL OR n.fecha_limite_cierre IS NULL OR n.verificador_eficacia_id IS NULL OR n.fecha_verificacion_prevista IS NULL
        OR length(btrim(coalesce(n.analisis_causa_raiz,'')))<10 OR n.metodo_analisis IS NULL
        OR NOT EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL AND a.tipo='correctiva' AND a.estado<>'cancelada')
        OR coalesce((SELECT v.resultado<>'eficaz' FROM public.verificaciones_eficacia v WHERE v.no_conformidad_id=n.id ORDER BY v.fecha_verificacion DESC,v.id DESC LIMIT 1),false))
    UNION ALL
    SELECT 'verificaciones',n.id,n.codigo,'Verificar eficacia: '||n.titulo,n.fecha_verificacion_prevista,'/ncs/'||n.id::text
    FROM public.no_conformidades n WHERE n.activo AND n.eliminado_en IS NULL AND n.estado NOT IN ('cerrada','aceptado_riesgo')
      AND n.verificador_eficacia_id=public.fn_usuario_id_actual()
      AND private.fn_bloqueo_documental_nc(n.id) IS NULL
      AND EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL AND a.estado='completada' AND a.tipo='correctiva')
      AND NOT EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL AND a.estado NOT IN ('completada','cancelada'))
      AND NOT coalesce((SELECT v.resultado='eficaz' AND v.revision_tratamiento=n.revision_tratamiento AND coalesce(v.contexto_documental,'[]'::jsonb)=private.fn_contexto_documental_nc(n.id) FROM public.verificaciones_eficacia v WHERE v.no_conformidad_id=n.id ORDER BY v.fecha_verificacion DESC,v.id DESC LIMIT 1),false)
    UNION ALL
    SELECT 'cierres',n.id,n.codigo,'Cerrar NC: '||n.titulo,n.fecha_limite_cierre,'/ncs/'||n.id::text
    FROM public.no_conformidades n WHERE n.activo AND n.eliminado_en IS NULL AND n.estado NOT IN ('cerrada','aceptado_riesgo')
      AND n.responsable_tratamiento_id=public.fn_usuario_id_actual()
      AND private.fn_motivo_bloqueo_cierre(n.id) IS NULL
      AND (SELECT v.resultado='eficaz' AND v.revision_tratamiento=n.revision_tratamiento FROM public.verificaciones_eficacia v WHERE v.no_conformidad_id=n.id ORDER BY v.fecha_verificacion DESC,v.id DESC LIMIT 1)
    UNION ALL
    SELECT 'documentacion',n.id,n.codigo,private.fn_bloqueo_documental_nc(n.id),n.fecha_limite_cierre,'/ncs/'||n.id::text
    FROM public.no_conformidades n WHERE n.activo AND n.eliminado_en IS NULL AND n.estado NOT IN ('cerrada','aceptado_riesgo')
      AND (n.responsable_tratamiento_id=public.fn_usuario_id_actual() OR EXISTS(
        SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL
          AND a.requiere_cambio_documental AND a.estado<>'cancelada' AND a.responsable_id=public.fn_usuario_id_actual()))
      AND private.fn_bloqueo_documental_nc(n.id) IS NOT NULL
    UNION ALL
    SELECT 'controles_observados',e.id,e.contexto->'control'->>'codigo','Tratar resultado '||e.resultado||': '||(e.contexto->'control'->>'nombre'),
      (e.fecha_ejecucion AT TIME ZONE p_zona)::date,'/controles/'||e.control_id::text||'/ejecuciones'
    FROM public.control_ejecuciones e WHERE e.resultado IN ('parcial','inefectivo')
      AND (private.fn_puede_gestionar_control(e.control_id) OR private.fn_es_responsable_control(e.control_id))
      AND NOT EXISTS(SELECT 1 FROM public.no_conformidades n WHERE n.control_ejecucion_id=e.id)
  )
  SELECT b.modulo,b.entidad_id,b.codigo,b.titulo,b.fecha_limite,b.fecha_limite-(now() AT TIME ZONE p_zona)::date,
    CASE WHEN b.fecha_limite IS NULL THEN 'recordatorio' WHEN b.fecha_limite<(now() AT TIME ZONE p_zona)::date THEN 'vencido'
      WHEN b.fecha_limite=(now() AT TIME ZONE p_zona)::date THEN 'vencido_hoy' ELSE 'recordatorio' END,b.url_destino FROM base b;
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
