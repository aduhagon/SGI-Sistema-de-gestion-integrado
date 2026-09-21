-- Fase 3: origen verificable, tratamiento y cierre de no conformidades.
BEGIN;

ALTER TABLE public.control_ejecuciones ADD COLUMN contexto jsonb;
ALTER TABLE public.hallazgos ADD COLUMN control_ejecucion_id uuid
  REFERENCES public.control_ejecuciones(id) ON DELETE RESTRICT;
ALTER TABLE public.no_conformidades
  ADD COLUMN control_ejecucion_id uuid REFERENCES public.control_ejecuciones(id) ON DELETE RESTRICT,
  ADD COLUMN verificador_eficacia_id uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  ADD COLUMN fecha_verificacion_prevista date,
  ADD COLUMN revision_tratamiento integer NOT NULL DEFAULT 0;
ALTER TABLE public.verificaciones_eficacia ADD COLUMN revision_tratamiento integer;
ALTER TABLE public.acciones ADD COLUMN evidencia_descripcion text;

CREATE INDEX idx_hallazgo_ejecucion ON public.hallazgos(control_ejecucion_id);
ALTER TABLE public.no_conformidades ADD CONSTRAINT uq_nc_ejecucion UNIQUE(control_ejecucion_id);
ALTER TABLE public.no_conformidades ADD CONSTRAINT uq_nc_hallazgo UNIQUE(hallazgo_id);
CREATE INDEX idx_nc_verificador ON public.no_conformidades(verificador_eficacia_id, fecha_verificacion_prevista);
CREATE INDEX idx_verificacion_nc_fecha ON public.verificaciones_eficacia(no_conformidad_id, fecha_verificacion DESC, id);

CREATE SEQUENCE private.codigo_nc_fase3;
CREATE SEQUENCE private.codigo_accion_fase3;
SELECT setval('private.codigo_nc_fase3', greatest(1, coalesce(max(split_part(codigo,'-',3)::bigint),0)+1), false) FROM public.no_conformidades;
SELECT setval('private.codigo_accion_fase3', greatest(1, coalesce(max(split_part(codigo,'-',3)::bigint),0)+1), false) FROM public.acciones;
REVOKE ALL ON SEQUENCE private.codigo_nc_fase3, private.codigo_accion_fase3 FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.fn_puede_tratar_nc(p_nc uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.fn_usuario_id_actual() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.no_conformidades n WHERE n.id=p_nc AND n.activo AND n.eliminado_en IS NULL
    AND (private.fn_usuario_es_gestor_sgi() OR public.fn_usuario_es_auditor_o_sgi()
      OR n.responsable_tratamiento_id=public.fn_usuario_id_actual()
      OR private.fn_puede_gestionar_proceso(n.proceso_id))
  );
$$;

CREATE FUNCTION private.fn_contexto_ejecucion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.controles; p public.procesos;
BEGIN
  SELECT * INTO STRICT c FROM public.controles WHERE id=NEW.control_id FOR UPDATE;
  SELECT * INTO STRICT p FROM public.procesos WHERE id=c.proceso_id;
  NEW.contexto := jsonb_build_object(
    'control', jsonb_build_object('id',c.id,'codigo',c.codigo,'nombre',c.nombre),
    'proceso', jsonb_build_object('id',p.id,'codigo',p.codigo,'nombre',p.nombre),
    'riesgos', coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'codigo',r.codigo,'nombre',r.titulo) ORDER BY r.codigo)
      FROM public.control_riesgo x JOIN public.riesgos r ON r.id=x.riesgo_id
      WHERE x.control_id=c.id AND x.activo AND x.eliminado_en IS NULL AND r.activo AND r.eliminado_en IS NULL),'[]'::jsonb),
    'requisitos', coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'codigo',n.codigo||' '||r.clausula,'nombre',r.titulo) ORDER BY r.clausula)
      FROM public.control_requisito x JOIN public.requisitos r ON r.id=x.requisito_id
      JOIN public.versiones_norma v ON v.id=r.version_norma_id JOIN public.normas n ON n.id=v.norma_id
      WHERE x.control_id=c.id AND x.activo AND x.eliminado_en IS NULL AND r.activo AND r.eliminado_en IS NULL),'[]'::jsonb),
    'documentos', coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'codigo',d.codigo,'nombre',d.titulo,'version_vigente_id',d.version_vigente_id) ORDER BY d.codigo)
      FROM public.control_documento x JOIN public.documentos d ON d.id=x.documento_id
      WHERE x.control_id=c.id AND x.activo AND x.eliminado_en IS NULL AND d.activo AND d.eliminado_en IS NULL),'[]'::jsonb),
    'capturado_en',clock_timestamp());
  RETURN NEW;
END; $$;
CREATE TRIGGER a_fase3_contexto_ejecucion BEFORE INSERT ON public.control_ejecuciones
FOR EACH ROW EXECUTE FUNCTION private.fn_contexto_ejecucion();

CREATE FUNCTION private.fn_motivo_bloqueo_cierre(p_nc uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE n public.no_conformidades; v public.verificaciones_eficacia;
BEGIN
  SELECT * INTO n FROM public.no_conformidades WHERE id=p_nc AND activo AND eliminado_en IS NULL;
  IF NOT FOUND THEN RETURN 'No conformidad no encontrada.'; END IF;
  IF n.responsable_tratamiento_id IS NULL OR n.fecha_limite_cierre IS NULL
     OR n.verificador_eficacia_id IS NULL OR n.fecha_verificacion_prevista IS NULL THEN
    RETURN 'Completá los responsables y las fechas del tratamiento y la verificación.';
  END IF;
  IF length(btrim(coalesce(n.analisis_causa_raiz,''))) < 10 OR n.metodo_analisis IS NULL THEN
    RETURN 'Registrá el análisis de causa raíz antes del cierre.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.acciones WHERE no_conformidad_id=p_nc AND activo AND eliminado_en IS NULL AND estado='completada' AND tipo='correctiva') THEN
    RETURN 'Falta una acción correctiva completada.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.acciones WHERE no_conformidad_id=p_nc AND activo AND eliminado_en IS NULL AND estado NOT IN ('completada','cancelada')) THEN
    RETURN 'Hay acciones pendientes de completar.';
  END IF;
  SELECT * INTO v FROM public.verificaciones_eficacia WHERE no_conformidad_id=p_nc
    ORDER BY fecha_verificacion DESC, id DESC LIMIT 1;
  IF NOT FOUND OR v.resultado <> 'eficaz' THEN RETURN 'La última verificación de eficacia debe ser eficaz.'; END IF;
  IF v.revision_tratamiento IS DISTINCT FROM n.revision_tratamiento THEN
    RETURN 'El tratamiento cambió después de la verificación. Verificá nuevamente.';
  END IF;
  IF v.verificador_usuario_id IS DISTINCT FROM n.verificador_eficacia_id
     OR length(btrim(coalesce(v.evidencia_revisada,''))) < 5 THEN
    RETURN 'Falta una verificación independiente con evidencia revisada.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=p_nc AND a.activo AND a.eliminado_en IS NULL AND a.estado='completada'
    AND (NOT (a.id=ANY(v.acciones_verificadas)) OR a.responsable_id=v.verificador_usuario_id OR a.completada_por_usuario_id=v.verificador_usuario_id
      OR length(btrim(coalesce(a.evidencia_descripcion,'')))<5)) THEN
    RETURN 'La verificación debe cubrir todas las acciones completadas con evidencia e independencia.';
  END IF;
  RETURN NULL;
END; $$;

CREATE FUNCTION private.fn_guardar_integridad_nc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.control_ejecuciones; h public.hallazgos; v_motivo text; v_actor uuid := public.fn_usuario_id_actual(); v_revision_accion boolean;
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.codigo := 'NC-'||extract(year from current_date)::text||'-'||lpad(nextval('private.codigo_nc_fase3')::text,5,'0');
    NEW.creado_por := v_actor;
    NEW.revision_tratamiento := 0;
    IF NEW.estado NOT IN ('abierta','en_analisis') THEN RAISE EXCEPTION 'Una NC nueva debe iniciar abierta o en análisis.'; END IF;
    IF NEW.hallazgo_id IS NOT NULL THEN
      SELECT * INTO STRICT h FROM public.hallazgos WHERE id=NEW.hallazgo_id AND activo AND eliminado_en IS NULL FOR UPDATE;
      IF h.tipo NOT IN ('no_conformidad_mayor','no_conformidad_menor') OR
        NOT EXISTS(SELECT 1 FROM public.auditorias WHERE id=h.auditoria_id AND estado='cerrada' AND activo AND eliminado_en IS NULL) THEN
        RAISE EXCEPTION 'El hallazgo debe ser una NC de una auditoría cerrada.';
      END IF;
      NEW.control_ejecucion_id := h.control_ejecucion_id;
      NEW.proceso_id := h.proceso_id;
      NEW.requisito_id := h.requisito_id;
      NEW.documento_id := h.documento_id;
      SELECT CASE WHEN tipo='interna' THEN 'auditoria_interna'::public.nc_origen_enum ELSE 'auditoria_externa'::public.nc_origen_enum END
        INTO NEW.origen FROM public.auditorias WHERE id=h.auditoria_id;
    END IF;
    IF NEW.control_ejecucion_id IS NOT NULL THEN
      SELECT * INTO STRICT e FROM public.control_ejecuciones WHERE id=NEW.control_ejecucion_id;
      IF NEW.hallazgo_id IS NULL THEN
        IF e.resultado NOT IN ('parcial','inefectivo') THEN RAISE EXCEPTION 'La ejecución no tiene un resultado parcial o inefectivo.'; END IF;
        NEW.origen := 'control_interno';
      END IF;
      NEW.proceso_id := (e.contexto->'proceso'->>'id')::uuid;
      IF NEW.proceso_id IS NULL THEN RAISE EXCEPTION 'La ejecución no tiene contexto de proceso.'; END IF;
      NEW.riesgo_origen_id := CASE WHEN jsonb_array_length(e.contexto->'riesgos')=1 THEN (e.contexto->'riesgos'->0->>'id')::uuid END;
      IF NEW.requisito_id IS NULL AND jsonb_array_length(e.contexto->'requisitos')=1 THEN NEW.requisito_id := (e.contexto->'requisitos'->0->>'id')::uuid; END IF;
      IF NEW.documento_id IS NULL AND jsonb_array_length(e.contexto->'documentos')=1 THEN NEW.documento_id := (e.contexto->'documentos'->0->>'id')::uuid; END IF;
    END IF;
  ELSE
    IF (NEW.control_ejecucion_id,NEW.hallazgo_id) IS DISTINCT FROM (OLD.control_ejecucion_id,OLD.hallazgo_id) THEN
      RAISE EXCEPTION 'El origen de la NC es inmutable.';
    END IF;
    IF OLD.estado='cerrada' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'La NC cerrada conserva su historial. Registrá un nuevo tratamiento.'; END IF;
    v_revision_accion := pg_trigger_depth()>1 AND NEW.revision_tratamiento=OLD.revision_tratamiento+1;
    NEW.revision_tratamiento := OLD.revision_tratamiento;
    IF (NEW.analisis_causa_raiz,NEW.metodo_analisis,NEW.responsable_tratamiento_id,NEW.verificador_eficacia_id,NEW.accion_inmediata_descripcion,NEW.requiere_accion_inmediata,NEW.proceso_id,NEW.requisito_id,NEW.documento_id,NEW.riesgo_origen_id)
      IS DISTINCT FROM (OLD.analisis_causa_raiz,OLD.metodo_analisis,OLD.responsable_tratamiento_id,OLD.verificador_eficacia_id,OLD.accion_inmediata_descripcion,OLD.requiere_accion_inmediata,OLD.proceso_id,OLD.requisito_id,OLD.documento_id,OLD.riesgo_origen_id) THEN
      NEW.revision_tratamiento := OLD.revision_tratamiento+1;
    ELSIF v_revision_accion THEN
      -- Las modificaciones de acciones invalidan la verificación del conjunto.
      NEW.revision_tratamiento := OLD.revision_tratamiento+1;
    END IF;
    IF OLD.control_ejecucion_id IS NOT NULL AND NEW.proceso_id IS DISTINCT FROM OLD.proceso_id THEN RAISE EXCEPTION 'No se puede cambiar el proceso de una NC originada en un control.'; END IF;
    IF NEW.estado='cerrada' AND OLD.estado<>'cerrada' THEN
      IF NOT private.fn_puede_tratar_nc(OLD.id) THEN RAISE EXCEPTION 'Sin permisos para cerrar esta NC.'; END IF;
      IF NEW.revision_tratamiento<>OLD.revision_tratamiento THEN RAISE EXCEPTION 'Guardá y verificá el tratamiento antes del cierre.'; END IF;
      v_motivo := private.fn_motivo_bloqueo_cierre(OLD.id);
      IF v_motivo IS NOT NULL THEN RAISE EXCEPTION '%',v_motivo; END IF;
      IF length(btrim(coalesce(NEW.motivo_cierre,'')))<5 THEN RAISE EXCEPTION 'El motivo de cierre es obligatorio.'; END IF;
      NEW.cerrado_por_usuario_id := v_actor;
      NEW.fecha_cierre_real := clock_timestamp();
    END IF;
  END IF;
  IF NEW.verificador_eficacia_id IS NOT NULL AND (
    NEW.verificador_eficacia_id=NEW.responsable_tratamiento_id OR NOT EXISTS(
      SELECT 1 FROM public.usuarios u JOIN public.asignaciones_rol_global a ON a.usuario_id=u.id
      JOIN public.roles_globales r ON r.id=a.rol_id WHERE u.id=NEW.verificador_eficacia_id AND u.activo AND u.eliminado_en IS NULL
      AND r.activo AND r.codigo IN ('admin','responsable_sgi','superadmin') AND a.vigente_hasta IS NULL)) THEN
    RAISE EXCEPTION 'Elegí un verificador SGI activo distinto del responsable de tratamiento.';
  END IF;
  IF NEW.responsable_tratamiento_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id=NEW.responsable_tratamiento_id AND activo AND eliminado_en IS NULL) THEN
    RAISE EXCEPTION 'El responsable de tratamiento debe estar activo.';
  END IF;
  IF NEW.verificador_eficacia_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.acciones WHERE no_conformidad_id=NEW.id AND activo AND eliminado_en IS NULL AND estado<>'cancelada'
      AND (responsable_id=NEW.verificador_eficacia_id OR completada_por_usuario_id=NEW.verificador_eficacia_id)) THEN
    RAISE EXCEPTION 'El verificador no puede haber sido responsable ni ejecutor de las acciones.';
  END IF;
  IF NEW.requiere_accion_inmediata AND length(btrim(coalesce(NEW.accion_inmediata_descripcion,'')))<5 THEN
    RAISE EXCEPTION 'Describí la corrección inmediata requerida.';
  END IF;
  IF NEW.fecha_verificacion_prevista>NEW.fecha_limite_cierre THEN RAISE EXCEPTION 'La verificación debe programarse antes del cierre previsto.'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER b_fase3_integridad_nc BEFORE INSERT OR UPDATE ON public.no_conformidades
FOR EACH ROW EXECUTE FUNCTION private.fn_guardar_integridad_nc();

CREATE FUNCTION private.fn_sincronizar_hallazgo_nc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE public.hallazgos SET no_conformidad_id=NEW.id,
      estado=CASE WHEN NEW.estado='cerrada' THEN 'cerrado'::public.hallazgo_estado_enum ELSE 'en_tratamiento'::public.hallazgo_estado_enum END,
      fecha_cierre_real=NEW.fecha_cierre_real, cerrado_por_usuario_id=NEW.cerrado_por_usuario_id,
      motivo_cierre=NEW.motivo_cierre, actualizado_por=public.fn_usuario_id_actual()
      WHERE id=NEW.hallazgo_id OR no_conformidad_id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER fase3_sincronizar_hallazgo AFTER INSERT OR UPDATE OF estado ON public.no_conformidades
FOR EACH ROW EXECUTE FUNCTION private.fn_sincronizar_hallazgo_nc();

CREATE FUNCTION private.fn_integridad_accion_nc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n public.no_conformidades; v_actor uuid := public.fn_usuario_id_actual();
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.codigo := 'ACC-'||extract(year from current_date)::text||'-'||lpad(nextval('private.codigo_accion_fase3')::text,5,'0');
    NEW.creado_por := v_actor;
  END IF;
  IF TG_OP='UPDATE' AND NEW.no_conformidad_id IS DISTINCT FROM OLD.no_conformidad_id THEN RAISE EXCEPTION 'No se puede cambiar la NC de una acción.'; END IF;
  IF NEW.no_conformidad_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO STRICT n FROM public.no_conformidades WHERE id=NEW.no_conformidad_id AND activo AND eliminado_en IS NULL FOR UPDATE;
  IF n.estado IN ('cerrada','aceptado_riesgo') THEN RAISE EXCEPTION 'El tratamiento de esta NC ya está cerrado.'; END IF;
  IF v_actor IS NULL OR NOT (private.fn_puede_tratar_nc(n.id) OR (TG_OP='UPDATE' AND OLD.responsable_id=v_actor)) THEN
    RAISE EXCEPTION 'Sin permisos para modificar acciones de esta NC.';
  END IF;
  NEW.proceso_id := n.proceso_id;
  NEW.hallazgo_id := n.hallazgo_id;
  NEW.documento_id := n.documento_id;
  NEW.actualizado_por := v_actor;
  IF NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id=NEW.responsable_id AND activo AND eliminado_en IS NULL) THEN RAISE EXCEPTION 'El responsable debe estar activo.'; END IF;
  IF NEW.responsable_id=n.verificador_eficacia_id THEN RAISE EXCEPTION 'El verificador no puede ser responsable de una acción.'; END IF;
  IF NEW.estado='completada' THEN
    IF length(btrim(coalesce(NEW.evidencia_descripcion,'')))<5 OR length(btrim(coalesce(NEW.resultado_obtenido,'')))<3 THEN
      RAISE EXCEPTION 'Registrá resultado y evidencia de la acción antes de completarla.';
    END IF;
    IF TG_OP='INSERT' OR OLD.estado<>'completada' THEN
      NEW.fecha_completada := clock_timestamp(); NEW.completada_por_usuario_id := v_actor;
    ELSE
      NEW.fecha_completada := OLD.fecha_completada; NEW.completada_por_usuario_id := OLD.completada_por_usuario_id;
    END IF;
    IF NEW.completada_por_usuario_id=n.verificador_eficacia_id THEN RAISE EXCEPTION 'El verificador no puede ejecutar la acción que verificará.'; END IF;
  END IF;
  UPDATE public.no_conformidades SET revision_tratamiento=revision_tratamiento+1,
    estado='en_tratamiento',actualizado_por=v_actor WHERE id=n.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER b_fase3_integridad_accion BEFORE INSERT OR UPDATE ON public.acciones
FOR EACH ROW EXECUTE FUNCTION private.fn_integridad_accion_nc();

CREATE OR REPLACE FUNCTION public.fn_validar_segregacion_verificacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n public.no_conformidades; v_actor uuid := public.fn_usuario_id_actual();
BEGIN
  SELECT * INTO STRICT n FROM public.no_conformidades WHERE id=NEW.no_conformidad_id AND activo AND eliminado_en IS NULL FOR UPDATE;
  IF v_actor IS NULL OR NOT private.fn_usuario_es_gestor_sgi() OR NEW.verificador_usuario_id IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'La verificación corresponde al usuario SGI autenticado.'; END IF;
  IF n.estado IN ('cerrada','aceptado_riesgo') THEN RAISE EXCEPTION 'La NC ya está cerrada.'; END IF;
  IF n.verificador_eficacia_id IS DISTINCT FROM v_actor OR n.responsable_tratamiento_id=v_actor THEN RAISE EXCEPTION 'Solo el verificador independiente asignado puede verificar esta NC.'; END IF;
  IF n.fecha_verificacion_prevista IS NULL OR n.fecha_limite_cierre IS NULL OR n.responsable_tratamiento_id IS NULL
    OR length(btrim(coalesce(n.analisis_causa_raiz,'')))<10 OR n.metodo_analisis IS NULL THEN RAISE EXCEPTION 'Completá el plan de tratamiento y el análisis de causa.'; END IF;
  IF coalesce(cardinality(NEW.acciones_verificadas),0)=0 THEN RAISE EXCEPTION 'Seleccioná las acciones que verificaste.'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(NEW.acciones_verificadas) x(id) LEFT JOIN public.acciones a ON a.id=x.id
    WHERE a.id IS NULL OR a.no_conformidad_id IS DISTINCT FROM n.id OR NOT a.activo OR a.eliminado_en IS NOT NULL OR a.estado<>'completada'
      OR a.responsable_id=v_actor OR a.completada_por_usuario_id=v_actor OR length(btrim(coalesce(a.evidencia_descripcion,'')))<5) THEN
    RAISE EXCEPTION 'Las acciones deben pertenecer a esta NC, estar completadas con evidencia y haber sido ejecutadas por otra persona.';
  END IF;
  IF length(btrim(coalesce(NEW.evidencia_revisada,'')))<5 OR length(btrim(coalesce(NEW.conclusion,'')))<10 THEN RAISE EXCEPTION 'Describí la evidencia revisada y la conclusión.'; END IF;
  IF NEW.resultado='eficaz' AND (EXISTS(SELECT 1 FROM public.acciones WHERE no_conformidad_id=n.id AND activo AND eliminado_en IS NULL
    AND estado<>'cancelada' AND (estado<>'completada' OR NOT(id=ANY(NEW.acciones_verificadas))))
    OR NOT EXISTS(SELECT 1 FROM public.acciones WHERE no_conformidad_id=n.id AND activo AND eliminado_en IS NULL AND tipo='correctiva' AND estado='completada')) THEN
    RAISE EXCEPTION 'Para declarar eficacia deben estar completadas y verificadas todas las acciones, incluida una correctiva.';
  END IF;
  NEW.fecha_verificacion := clock_timestamp(); NEW.creado_en := NEW.fecha_verificacion;
  NEW.revision_tratamiento := n.revision_tratamiento;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_cerrar_nc(p_nc_id uuid,p_motivo text,p_forzar boolean DEFAULT false)
RETURNS TABLE(cerrada boolean,mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_motivo text;
BEGIN
  IF NOT private.fn_puede_tratar_nc(p_nc_id) THEN RAISE EXCEPTION 'Sin permisos para cerrar esta NC.'; END IF;
  PERFORM 1 FROM public.no_conformidades WHERE id=p_nc_id FOR UPDATE;
  IF p_forzar THEN RETURN QUERY SELECT false,'El cierre requiere eficacia vigente; no admite forzado.'; RETURN; END IF;
  v_motivo := private.fn_motivo_bloqueo_cierre(p_nc_id);
  IF v_motivo IS NOT NULL THEN RETURN QUERY SELECT false,v_motivo; RETURN; END IF;
  UPDATE public.no_conformidades SET estado='cerrada',motivo_cierre=btrim(p_motivo),actualizado_por=public.fn_usuario_id_actual() WHERE id=p_nc_id;
  RETURN QUERY SELECT true,'No conformidad cerrada con eficacia verificada.';
END; $$;

CREATE FUNCTION public.fn_crear_nc_desde_control(p_ejecucion_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.control_ejecuciones; v_id uuid; v_actor uuid:=public.fn_usuario_id_actual(); v_proceso uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ejecucion_id::text,0));
  SELECT * INTO STRICT e FROM public.control_ejecuciones WHERE id=p_ejecucion_id FOR UPDATE;
  v_proceso := (e.contexto->'proceso'->>'id')::uuid;
  IF v_actor IS NULL OR NOT (private.fn_puede_gestionar_proceso(v_proceso) OR private.fn_es_responsable_control(e.control_id)) THEN RAISE EXCEPTION 'Sin permisos para tratar esta ejecución.'; END IF;
  SELECT id INTO v_id FROM public.no_conformidades WHERE control_ejecucion_id=e.id;
  IF v_id IS NOT NULL THEN
    IF NOT private.fn_puede_tratar_nc(v_id) THEN RAISE EXCEPTION 'La ejecución ya tiene tratamiento asignado.'; END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.no_conformidades(titulo,descripcion,origen,proceso_id,control_ejecucion_id,responsable_tratamiento_id,fecha_limite_cierre,creado_por)
  VALUES('Resultado '||e.resultado||': '||(e.contexto->'control'->>'nombre'),
    concat_ws(E'\n',e.detalle,'Evidencia de ejecución: '||e.evidencia_descripcion),
    'control_interno',v_proceso,e.id,v_actor,current_date+30,v_actor) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.fn_crear_nc_desde_hallazgo(p_hallazgo_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE h public.hallazgos; v_id uuid;
BEGIN
  SELECT * INTO STRICT h FROM public.hallazgos WHERE id=p_hallazgo_id AND activo AND eliminado_en IS NULL FOR UPDATE;
  IF h.no_conformidad_id IS NOT NULL THEN RETURN h.no_conformidad_id; END IF;
  IF h.tipo NOT IN ('no_conformidad_mayor','no_conformidad_menor') OR NOT EXISTS(
    SELECT 1 FROM public.auditorias WHERE id=h.auditoria_id AND estado='cerrada' AND activo AND eliminado_en IS NULL) THEN
    RAISE EXCEPTION 'El hallazgo debe ser una NC de una auditoría cerrada.';
  END IF;
  IF h.control_ejecucion_id IS NOT NULL THEN
    -- Serializa la conversión con la apertura directa desde la misma ejecución.
    PERFORM pg_advisory_xact_lock(hashtextextended(h.control_ejecucion_id::text,0));
    SELECT id INTO v_id FROM public.no_conformidades WHERE control_ejecucion_id=h.control_ejecucion_id;
    IF v_id IS NOT NULL THEN
      UPDATE public.hallazgos h2 SET no_conformidad_id=n.id,
        estado=CASE WHEN n.estado='cerrada' THEN 'cerrado'::public.hallazgo_estado_enum ELSE 'en_tratamiento'::public.hallazgo_estado_enum END,
        motivo_cierre=n.motivo_cierre,fecha_cierre_real=n.fecha_cierre_real,cerrado_por_usuario_id=n.cerrado_por_usuario_id
        FROM public.no_conformidades n WHERE h2.id=h.id AND n.id=v_id;
      RETURN v_id;
    END IF;
  END IF;
  INSERT INTO public.no_conformidades(titulo,descripcion,severidad,origen,hallazgo_id,responsable_tratamiento_id,fecha_limite_cierre,creado_por)
    VALUES(h.titulo,h.descripcion,coalesce(h.severidad,'media'),'auditoria_interna',h.id,public.fn_usuario_id_actual(),current_date+30,public.fn_usuario_id_actual()) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION private.fn_integridad_hallazgo_control() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.control_ejecuciones; v_proceso uuid; n public.no_conformidades;
BEGIN
  IF TG_OP='UPDATE' AND OLD.no_conformidad_id IS NOT NULL AND NEW.no_conformidad_id IS DISTINCT FROM OLD.no_conformidad_id THEN
    RAISE EXCEPTION 'No se puede desvincular el tratamiento de un hallazgo.';
  END IF;
  IF NEW.no_conformidad_id IS NOT NULL THEN
    SELECT * INTO STRICT n FROM public.no_conformidades WHERE id=NEW.no_conformidad_id;
    IF NEW.control_ejecucion_id IS NOT NULL AND n.control_ejecucion_id IS DISTINCT FROM NEW.control_ejecucion_id THEN
      RAISE EXCEPTION 'El hallazgo y la NC deben corresponder a la misma ejecución.';
    END IF;
    IF NEW.estado='cerrado' AND n.estado<>'cerrada' THEN RAISE EXCEPTION 'Primero debe cerrarse la NC vinculada.'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.control_ejecucion_id IS DISTINCT FROM OLD.control_ejecucion_id THEN RAISE EXCEPTION 'La evidencia de origen del hallazgo es inmutable.'; END IF;
  IF NEW.control_ejecucion_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO STRICT e FROM public.control_ejecuciones WHERE id=NEW.control_ejecucion_id;
  v_proceso := (e.contexto->'proceso'->>'id')::uuid;
  IF TG_OP='INSERT' THEN
    IF NOT EXISTS(SELECT 1 FROM public.auditoria_alcance WHERE auditoria_id=NEW.auditoria_id AND proceso_id=v_proceso AND activo AND eliminado_en IS NULL) THEN RAISE EXCEPTION 'El proceso del control debe estar en el alcance de la auditoría.'; END IF;
    IF NEW.proceso_id IS NOT NULL AND NEW.proceso_id<>v_proceso THEN RAISE EXCEPTION 'La ejecución pertenece a otro proceso.'; END IF;
    NEW.proceso_id := v_proceso;
  ELSIF NEW.proceso_id IS DISTINCT FROM OLD.proceso_id THEN RAISE EXCEPTION 'El proceso del hallazgo debe conservar su origen.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER b_fase3_hallazgo_control BEFORE INSERT OR UPDATE ON public.hallazgos
FOR EACH ROW EXECUTE FUNCTION private.fn_integridad_hallazgo_control();

-- El responsable de la NC necesita leer y gestionar su plan de acciones.
DROP POLICY acciones_select ON public.acciones;
CREATE POLICY acciones_select ON public.acciones FOR SELECT TO authenticated USING (
  activo AND eliminado_en IS NULL AND (public.fn_usuario_es_auditor_o_sgi() OR responsable_id=public.fn_usuario_id_actual()
  OR public.fn_usuario_id_actual()=ANY(participantes) OR EXISTS(SELECT 1 FROM public.no_conformidades n WHERE n.id=acciones.no_conformidad_id)));
DROP POLICY acciones_insert ON public.acciones;
CREATE POLICY acciones_insert ON public.acciones FOR INSERT TO authenticated WITH CHECK (
  CASE WHEN no_conformidad_id IS NOT NULL THEN private.fn_puede_tratar_nc(no_conformidad_id)
  ELSE public.fn_usuario_es_auditor_o_sgi() OR private.fn_puede_gestionar_proceso(proceso_id) END);
DROP POLICY acciones_update ON public.acciones;
CREATE POLICY acciones_update ON public.acciones FOR UPDATE TO authenticated
USING (private.fn_puede_tratar_nc(no_conformidad_id) OR responsable_id=public.fn_usuario_id_actual() OR public.fn_usuario_es_auditor_o_sgi())
WITH CHECK (private.fn_puede_tratar_nc(no_conformidad_id) OR responsable_id=public.fn_usuario_id_actual() OR public.fn_usuario_es_auditor_o_sgi());
DROP POLICY no_conformidades_update ON public.no_conformidades;
CREATE POLICY no_conformidades_update ON public.no_conformidades FOR UPDATE TO authenticated
USING (private.fn_puede_tratar_nc(id)) WITH CHECK (private.fn_puede_tratar_nc(id));

REVOKE ALL ON FUNCTION private.fn_puede_tratar_nc(uuid),private.fn_contexto_ejecucion(),private.fn_motivo_bloqueo_cierre(uuid),private.fn_guardar_integridad_nc(),private.fn_sincronizar_hallazgo_nc(),private.fn_integridad_accion_nc(),private.fn_integridad_hallazgo_control() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.fn_puede_tratar_nc(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_crear_nc_desde_control(uuid),public.fn_crear_nc_desde_hallazgo(uuid),public.fn_cerrar_nc(uuid,text,boolean),public.fn_validar_segregacion_verificacion() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crear_nc_desde_control(uuid),public.fn_crear_nc_desde_hallazgo(uuid),public.fn_cerrar_nc(uuid,text,boolean) TO authenticated;
REVOKE UPDATE,DELETE ON public.verificaciones_eficacia FROM authenticated;

CREATE FUNCTION private.fn_puede_ver_nc(p_nc uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.fn_usuario_id_actual() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.no_conformidades n WHERE n.id=p_nc AND n.activo AND n.eliminado_en IS NULL
      AND (private.fn_puede_tratar_nc(n.id) OR n.verificador_eficacia_id=public.fn_usuario_id_actual()
        OR EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL
          AND (a.responsable_id=public.fn_usuario_id_actual() OR public.fn_usuario_id_actual()=ANY(a.participantes)))));
$$;
REVOKE ALL ON FUNCTION private.fn_puede_ver_nc(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fn_puede_ver_nc(uuid) TO authenticated;
CREATE FUNCTION private.fn_participa_acciones_nc(p_nc uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=p_nc AND a.activo AND a.eliminado_en IS NULL
    AND (a.responsable_id=public.fn_usuario_id_actual() OR public.fn_usuario_id_actual()=ANY(a.participantes)));
$$;
REVOKE ALL ON FUNCTION private.fn_participa_acciones_nc(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fn_participa_acciones_nc(uuid) TO authenticated;
DROP POLICY no_conformidades_select ON public.no_conformidades;
-- Evalúa la fila nueva directamente: INSERT ... RETURNING aún no la expone a
-- una función STABLE que vuelva a consultar la tabla.
CREATE POLICY no_conformidades_select ON public.no_conformidades FOR SELECT TO authenticated USING (
  activo AND eliminado_en IS NULL AND (private.fn_usuario_es_gestor_sgi() OR public.fn_usuario_es_auditor_o_sgi()
    OR responsable_tratamiento_id=public.fn_usuario_id_actual() OR verificador_eficacia_id=public.fn_usuario_id_actual()
    OR private.fn_puede_gestionar_proceso(proceso_id) OR private.fn_participa_acciones_nc(id)));

CREATE FUNCTION public.fn_estado_tratamiento_nc(p_nc_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.fn_puede_ver_nc(p_nc_id) THEN RAISE EXCEPTION 'Sin acceso a esta NC.'; END IF;
  RETURN (SELECT jsonb_build_object('puedeGestionar',private.fn_puede_tratar_nc(n.id) AND n.estado NOT IN ('cerrada','aceptado_riesgo'),
    'puedeVerificar',n.verificador_eficacia_id=public.fn_usuario_id_actual() AND private.fn_usuario_es_gestor_sgi() AND n.estado NOT IN ('cerrada','aceptado_riesgo'),
    'bloqueoCierre',private.fn_motivo_bloqueo_cierre(n.id)) FROM public.no_conformidades n WHERE n.id=p_nc_id);
END; $$;
CREATE FUNCTION public.fn_verificadores_mejora() RETURNS TABLE(id uuid,nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT u.id, coalesce(nullif(concat_ws(' ',p.nombre,p.apellido),''),u.username)
  FROM public.usuarios u JOIN public.personas p ON p.id=u.persona_id
  JOIN public.asignaciones_rol_global a ON a.usuario_id=u.id JOIN public.roles_globales r ON r.id=a.rol_id
  WHERE public.fn_usuario_id_actual() IS NOT NULL AND u.activo AND u.eliminado_en IS NULL
    AND r.activo AND r.codigo IN ('admin','responsable_sgi','superadmin') AND a.vigente_hasta IS NULL;
$$;

-- Conserva los pendientes existentes, verificando que se consulten los propios.
ALTER FUNCTION public.fn_pendientes_usuario(uuid,text) RENAME TO fn_pendientes_usuario_fase2;
REVOKE ALL ON FUNCTION public.fn_pendientes_usuario_fase2(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.fn_pendientes_usuario(p_usuario_id uuid,p_zona text DEFAULT 'America/Argentina/Buenos_Aires')
RETURNS TABLE(modulo text,entidad_id uuid,codigo text,titulo text,fecha_limite date,dias_restantes integer,nivel text,url_destino text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.fn_usuario_id_actual() IS NULL OR p_usuario_id IS DISTINCT FROM public.fn_usuario_id_actual() THEN RAISE EXCEPTION 'Solo se pueden consultar los pendientes propios.'; END IF;
  RETURN QUERY SELECT * FROM public.fn_pendientes_usuario_fase2(p_usuario_id,p_zona);
END; $$;

CREATE FUNCTION public.fn_pendientes_mejora(p_zona text DEFAULT 'America/Argentina/Buenos_Aires')
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
      AND EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL AND a.estado='completada' AND a.tipo='correctiva')
      AND NOT EXISTS(SELECT 1 FROM public.acciones a WHERE a.no_conformidad_id=n.id AND a.activo AND a.eliminado_en IS NULL AND a.estado NOT IN ('completada','cancelada'))
      AND NOT coalesce((SELECT v.resultado='eficaz' AND v.revision_tratamiento=n.revision_tratamiento FROM public.verificaciones_eficacia v WHERE v.no_conformidad_id=n.id ORDER BY v.fecha_verificacion DESC,v.id DESC LIMIT 1),false)
    UNION ALL
    SELECT 'cierres',n.id,n.codigo,'Cerrar NC: '||n.titulo,n.fecha_limite_cierre,'/ncs/'||n.id::text
    FROM public.no_conformidades n WHERE n.activo AND n.eliminado_en IS NULL AND n.estado NOT IN ('cerrada','aceptado_riesgo')
      AND n.responsable_tratamiento_id=public.fn_usuario_id_actual()
      AND (SELECT v.resultado='eficaz' AND v.revision_tratamiento=n.revision_tratamiento FROM public.verificaciones_eficacia v WHERE v.no_conformidad_id=n.id ORDER BY v.fecha_verificacion DESC,v.id DESC LIMIT 1)
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
REVOKE ALL ON FUNCTION public.fn_estado_tratamiento_nc(uuid),public.fn_verificadores_mejora(),public.fn_pendientes_usuario(uuid,text),public.fn_pendientes_mejora(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_estado_tratamiento_nc(uuid),public.fn_verificadores_mejora(),public.fn_pendientes_usuario(uuid,text),public.fn_pendientes_mejora(text) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
