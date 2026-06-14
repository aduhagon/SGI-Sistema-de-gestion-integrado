-- ============================================================================
-- Migración 020b — Motor de vencimientos y alertas automáticas
-- ============================================================================
-- Requiere 020a (tipos del enum) aplicada primero.
-- YA APLICADA en producción vía MCP el 13/06/2026. Respaldo para el repo.
--
-- Cubre 4 vencimientos, avisando ANTES (7 días) y DESPUÉS, anti-spam 7 días:
--   1. Documentos a revisar (proxima_revision) -> gestores del SGI
--   2. NC sin cerrar a tiempo (fecha_limite_cierre) -> responsable_tratamiento
--   3. Riesgos a re-evaluar (fecha_revision) -> responsable_id
--   4. Acuses pendientes vencidos (plazo_objetivo, sin firmar) -> usuario_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_procesar_vencimientos()
 RETURNS TABLE(docs_notif integer, ncs_notif integer, riesgos_notif integer, acuses_notif integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_docs int := 0; v_ncs int := 0; v_riesgos int := 0; v_acuses int := 0;
  v_aviso_dias int := 7;
BEGIN
  WITH gestores AS (
    SELECT DISTINCT a.usuario_id
    FROM asignaciones_rol_global a
    JOIN roles_globales rg ON rg.id = a.rol_id
    WHERE rg.codigo IN ('admin','responsable_sgi') AND a.vigente_hasta IS NULL
  ),
  docs AS (
    SELECT d.id, d.codigo, d.titulo, d.proxima_revision
    FROM documentos d
    WHERE d.proxima_revision IS NOT NULL AND d.eliminado_en IS NULL
      AND d.proxima_revision <= CURRENT_DATE + v_aviso_dias
  ),
  ins AS (
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    SELECT g.usuario_id, 'documento_revision_proxima',
      (CASE WHEN d.proxima_revision < CURRENT_DATE THEN 'alta' ELSE 'media' END)::severidad_enum,
      CASE WHEN d.proxima_revision < CURRENT_DATE THEN 'Documento con revisión vencida' ELSE 'Documento a revisar pronto' END,
      format('%s — %s %s revisión el %s.', d.codigo, d.titulo,
             CASE WHEN d.proxima_revision < CURRENT_DATE THEN 'necesitaba' ELSE 'necesita' END,
             to_char(d.proxima_revision, 'DD/MM/YYYY')),
      'documento', d.id, format('/documentos/%s', d.id), 'job_vencimientos'
    FROM docs d CROSS JOIN gestores g
    WHERE NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.tipo='documento_revision_proxima'
      AND n.entidad_id=d.id AND n.usuario_destino_id=g.usuario_id AND n.fecha_envio > now() - interval '7 days')
    RETURNING id
  ) SELECT count(*) INTO v_docs FROM ins;

  WITH ncs AS (
    SELECT nc.id, nc.codigo, nc.titulo, nc.fecha_limite_cierre, nc.responsable_tratamiento_id
    FROM no_conformidades nc
    WHERE nc.fecha_limite_cierre IS NOT NULL AND nc.estado <> 'cerrada'
      AND nc.responsable_tratamiento_id IS NOT NULL
      AND nc.fecha_limite_cierre <= CURRENT_DATE + v_aviso_dias
  ),
  ins AS (
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    SELECT nc.responsable_tratamiento_id, 'nc_vencida',
      (CASE WHEN nc.fecha_limite_cierre < CURRENT_DATE THEN 'alta' ELSE 'media' END)::severidad_enum,
      CASE WHEN nc.fecha_limite_cierre < CURRENT_DATE THEN 'No conformidad vencida sin cerrar' ELSE 'No conformidad por vencer' END,
      format('%s — %s %s el %s y sigue abierta.', nc.codigo, nc.titulo,
             CASE WHEN nc.fecha_limite_cierre < CURRENT_DATE THEN 'venció' ELSE 'vence' END,
             to_char(nc.fecha_limite_cierre, 'DD/MM/YYYY')),
      'no_conformidad', nc.id, format('/ncs/%s', nc.id), 'job_vencimientos'
    FROM ncs nc
    WHERE NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.tipo='nc_vencida'
      AND n.entidad_id=nc.id AND n.fecha_envio > now() - interval '7 days')
    RETURNING id
  ) SELECT count(*) INTO v_ncs FROM ins;

  WITH r AS (
    SELECT ri.id, ri.codigo, ri.titulo, ri.fecha_revision, ri.responsable_id
    FROM riesgos ri
    WHERE ri.fecha_revision IS NOT NULL AND ri.activo AND ri.eliminado_en IS NULL
      AND ri.estado IN ('identificado','en_tratamiento','materializado')
      AND ri.responsable_id IS NOT NULL
      AND ri.fecha_revision <= CURRENT_DATE + v_aviso_dias
  ),
  ins AS (
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    SELECT r.responsable_id, 'riesgo_revision_proxima',
      (CASE WHEN r.fecha_revision < CURRENT_DATE THEN 'alta' ELSE 'media' END)::severidad_enum,
      CASE WHEN r.fecha_revision < CURRENT_DATE THEN 'Riesgo con revisión vencida' ELSE 'Riesgo a re-evaluar pronto' END,
      format('%s — %s %s re-evaluación el %s.', r.codigo, r.titulo,
             CASE WHEN r.fecha_revision < CURRENT_DATE THEN 'necesitaba' ELSE 'necesita' END,
             to_char(r.fecha_revision, 'DD/MM/YYYY')),
      'riesgo', r.id, '/riesgos', 'job_vencimientos'
    FROM r
    WHERE NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.tipo='riesgo_revision_proxima'
      AND n.entidad_id=r.id AND n.fecha_envio > now() - interval '7 days')
    RETURNING id
  ) SELECT count(*) INTO v_riesgos FROM ins;

  WITH ac AS (
    SELECT al.id, al.usuario_id, al.plazo_objetivo
    FROM acuses_lectura al
    WHERE al.plazo_objetivo IS NOT NULL AND al.fecha_acuse IS NULL
      AND al.plazo_objetivo <= now() + (v_aviso_dias || ' days')::interval
  ),
  ins AS (
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    SELECT ac.usuario_id, 'acuse_pendiente',
      (CASE WHEN ac.plazo_objetivo < now() THEN 'alta' ELSE 'media' END)::severidad_enum,
      CASE WHEN ac.plazo_objetivo < now() THEN 'Tenés un acuse de lectura vencido' ELSE 'Acuse de lectura por vencer' END,
      format('Tenés un documento pendiente de acuse. El plazo %s el %s.',
             CASE WHEN ac.plazo_objetivo < now() THEN 'venció' ELSE 'vence' END,
             to_char(ac.plazo_objetivo, 'DD/MM/YYYY')),
      'acuse', ac.id, '/acuses', 'job_vencimientos'
    FROM ac
    WHERE NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.tipo='acuse_pendiente'
      AND n.entidad_id=ac.id AND n.fecha_envio > now() - interval '7 days')
    RETURNING id
  ) SELECT count(*) INTO v_acuses FROM ins;

  RETURN QUERY SELECT v_docs, v_ncs, v_riesgos, v_acuses;
END;
$function$;

-- Programación del cron (diario 7 AM):
SELECT cron.schedule('sgi-vencimientos', '0 7 * * *', 'SELECT * FROM fn_procesar_vencimientos()');

-- Útiles:
-- Desactivar:  SELECT cron.unschedule('sgi-vencimientos');
-- Prueba manual: SELECT * FROM fn_procesar_vencimientos();
