CREATE OR REPLACE FUNCTION public.fn_tablero_pendientes_responsables_detalle(
  p_zona text DEFAULT 'America/Argentina/Buenos_Aires',
  p_usuario_id uuid DEFAULT NULL
)
RETURNS TABLE(
  usuario_id uuid,
  responsable text,
  username text,
  modulo text,
  entidad_id uuid,
  codigo text,
  titulo text,
  fecha_limite date,
  dias_restantes integer,
  nivel text,
  url_destino text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE p_zona)::date;
BEGIN
  IF public.fn_usuario_id_actual() IS NULL THEN
    RAISE EXCEPTION 'Sesion no valida.';
  END IF;

  IF NOT private.fn_usuario_es_gestor_sgi() THEN
    RAISE EXCEPTION 'Solo un administrador o responsable del SGI puede consultar el tablero general de pendientes.';
  END IF;

  RETURN QUERY
  WITH usuarios_base AS (
    SELECT
      u.id,
      u.persona_id,
      u.username,
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', p.nombre, p.apellido)), ''), u.username, 'Usuario sin nombre') AS responsable
    FROM public.usuarios u
    LEFT JOIN public.personas p ON p.id = u.persona_id
    WHERE u.activo = true
      AND u.eliminado_en IS NULL
      AND (p_usuario_id IS NULL OR u.id = p_usuario_id)
  ),
  pendientes_base AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      p.modulo::text AS modulo,
      p.entidad_id AS entidad_id,
      p.codigo::text AS codigo,
      p.titulo::text AS titulo,
      p.fecha_limite AS fecha_limite,
      p.nivel::text AS nivel,
      p.dias_restantes AS dias_restantes,
      p.url_destino::text AS url_destino
    FROM usuarios_base ub
    CROSS JOIN LATERAL public.fn_pendientes_usuario_fase2(ub.id, p_zona) p
    WHERE p.nivel IS NOT NULL
  ),
  controles AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      'controles'::text AS modulo,
      c.id AS entidad_id,
      c.codigo::text AS codigo,
      (c.nombre || ' · ' || COALESCE(pr.nombre, 'Proceso'))::text AS titulo,
      c.proxima_ejecucion AS fecha_limite,
      CASE
        WHEN c.proxima_ejecucion < v_hoy THEN 'vencido'
        WHEN c.proxima_ejecucion = v_hoy THEN 'vencido_hoy'
        WHEN c.proxima_ejecucion <= v_hoy + GREATEST(1, CEIL(c.anticipacion_dias::numeric / 2))::int THEN 'advertencia'
        ELSE 'recordatorio'
      END AS nivel,
      (c.proxima_ejecucion - v_hoy)::int AS dias_restantes,
      ('/controles/' || c.id::text || '/ejecuciones')::text AS url_destino
    FROM usuarios_base ub
    JOIN public.persona_puesto pp
      ON pp.persona_id = ub.persona_id
     AND pp.vigente_hasta IS NULL
    JOIN public.controles c
      ON c.responsable_puesto_id = pp.puesto_id
    LEFT JOIN public.procesos pr ON pr.id = c.proceso_id
    WHERE c.estado = 'activo'
      AND c.activo = true
      AND c.eliminado_en IS NULL
      AND c.proxima_ejecucion IS NOT NULL
      AND c.proxima_ejecucion <= v_hoy + c.anticipacion_dias
  ),
  tratamiento AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      'tratamiento'::text AS modulo,
      n.id AS entidad_id,
      n.codigo::text AS codigo,
      (CASE
        WHEN n.responsable_tratamiento_id IS NULL
          OR n.fecha_limite_cierre IS NULL
          OR n.verificador_eficacia_id IS NULL
          OR n.fecha_verificacion_prevista IS NULL
          THEN 'Planificar tratamiento: '
        ELSE 'Completar causa y acciones: '
      END || n.titulo)::text AS titulo,
      n.fecha_limite_cierre AS fecha_limite,
      CASE
        WHEN n.fecha_limite_cierre IS NULL THEN 'recordatorio'
        WHEN n.fecha_limite_cierre < v_hoy THEN 'vencido'
        WHEN n.fecha_limite_cierre = v_hoy THEN 'vencido_hoy'
        ELSE 'recordatorio'
      END AS nivel,
      CASE WHEN n.fecha_limite_cierre IS NULL THEN NULL ELSE (n.fecha_limite_cierre - v_hoy)::int END AS dias_restantes,
      ('/ncs/' || n.id::text)::text AS url_destino
    FROM public.no_conformidades n
    JOIN usuarios_base ub ON ub.id = n.responsable_tratamiento_id
    WHERE n.activo
      AND n.eliminado_en IS NULL
      AND n.estado NOT IN ('cerrada', 'aceptado_riesgo')
      AND (
        n.fecha_limite_cierre IS NULL
        OR n.verificador_eficacia_id IS NULL
        OR n.fecha_verificacion_prevista IS NULL
        OR length(btrim(coalesce(n.analisis_causa_raiz, ''))) < 10
        OR n.metodo_analisis IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.acciones a
          WHERE a.no_conformidad_id = n.id
            AND a.activo
            AND a.eliminado_en IS NULL
            AND a.tipo = 'correctiva'
            AND a.estado <> 'cancelada'
        )
        OR coalesce((
          SELECT v.resultado <> 'eficaz'
          FROM public.verificaciones_eficacia v
          WHERE v.no_conformidad_id = n.id
          ORDER BY v.fecha_verificacion DESC, v.id DESC
          LIMIT 1
        ), false)
      )
  ),
  tratamiento_sin_responsable AS (
    SELECT
      NULL::uuid AS usuario_id,
      'Sin responsable'::text AS responsable,
      NULL::text AS username,
      'tratamiento'::text AS modulo,
      n.id AS entidad_id,
      n.codigo::text AS codigo,
      ('Planificar tratamiento: ' || n.titulo)::text AS titulo,
      n.fecha_limite_cierre AS fecha_limite,
      CASE
        WHEN n.fecha_limite_cierre IS NULL THEN 'advertencia'
        WHEN n.fecha_limite_cierre < v_hoy THEN 'vencido'
        WHEN n.fecha_limite_cierre = v_hoy THEN 'vencido_hoy'
        ELSE 'advertencia'
      END AS nivel,
      CASE WHEN n.fecha_limite_cierre IS NULL THEN NULL ELSE (n.fecha_limite_cierre - v_hoy)::int END AS dias_restantes,
      ('/ncs/' || n.id::text)::text AS url_destino
    FROM public.no_conformidades n
    WHERE p_usuario_id IS NULL
      AND n.activo
      AND n.eliminado_en IS NULL
      AND n.estado NOT IN ('cerrada', 'aceptado_riesgo')
      AND n.responsable_tratamiento_id IS NULL
  ),
  verificaciones AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      'verificaciones'::text AS modulo,
      n.id AS entidad_id,
      n.codigo::text AS codigo,
      ('Verificar eficacia: ' || n.titulo)::text AS titulo,
      n.fecha_verificacion_prevista AS fecha_limite,
      CASE
        WHEN n.fecha_verificacion_prevista IS NULL THEN 'recordatorio'
        WHEN n.fecha_verificacion_prevista < v_hoy THEN 'vencido'
        WHEN n.fecha_verificacion_prevista = v_hoy THEN 'vencido_hoy'
        ELSE 'recordatorio'
      END AS nivel,
      CASE WHEN n.fecha_verificacion_prevista IS NULL THEN NULL ELSE (n.fecha_verificacion_prevista - v_hoy)::int END AS dias_restantes,
      ('/ncs/' || n.id::text)::text AS url_destino
    FROM public.no_conformidades n
    JOIN usuarios_base ub ON ub.id = n.verificador_eficacia_id
    WHERE n.activo
      AND n.eliminado_en IS NULL
      AND n.estado NOT IN ('cerrada', 'aceptado_riesgo')
      AND EXISTS (
        SELECT 1
        FROM public.acciones a
        WHERE a.no_conformidad_id = n.id
          AND a.activo
          AND a.eliminado_en IS NULL
          AND a.estado = 'completada'
          AND a.tipo = 'correctiva'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.acciones a
        WHERE a.no_conformidad_id = n.id
          AND a.activo
          AND a.eliminado_en IS NULL
          AND a.estado NOT IN ('completada', 'cancelada')
      )
      AND private.fn_bloqueo_documental_nc(n.id) IS NULL
      AND NOT coalesce((
        SELECT v.resultado = 'eficaz'
          AND v.revision_tratamiento = n.revision_tratamiento
          AND coalesce(v.contexto_documental, '[]'::jsonb) = private.fn_contexto_documental_nc(n.id)
        FROM public.verificaciones_eficacia v
        WHERE v.no_conformidad_id = n.id
        ORDER BY v.fecha_verificacion DESC, v.id DESC
        LIMIT 1
      ), false)
  ),
  cierres AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      'cierres'::text AS modulo,
      n.id AS entidad_id,
      n.codigo::text AS codigo,
      ('Cerrar NC: ' || n.titulo)::text AS titulo,
      n.fecha_limite_cierre AS fecha_limite,
      CASE
        WHEN n.fecha_limite_cierre IS NULL THEN 'recordatorio'
        WHEN n.fecha_limite_cierre < v_hoy THEN 'vencido'
        WHEN n.fecha_limite_cierre = v_hoy THEN 'vencido_hoy'
        ELSE 'recordatorio'
      END AS nivel,
      CASE WHEN n.fecha_limite_cierre IS NULL THEN NULL ELSE (n.fecha_limite_cierre - v_hoy)::int END AS dias_restantes,
      ('/ncs/' || n.id::text)::text AS url_destino
    FROM public.no_conformidades n
    JOIN usuarios_base ub ON ub.id = n.responsable_tratamiento_id
    WHERE n.activo
      AND n.eliminado_en IS NULL
      AND n.estado NOT IN ('cerrada', 'aceptado_riesgo')
      AND private.fn_motivo_bloqueo_cierre(n.id) IS NULL
      AND (
        SELECT v.resultado = 'eficaz'
          AND v.revision_tratamiento = n.revision_tratamiento
        FROM public.verificaciones_eficacia v
        WHERE v.no_conformidad_id = n.id
        ORDER BY v.fecha_verificacion DESC, v.id DESC
        LIMIT 1
      )
  ),
  documentacion AS (
    SELECT
      ub.id AS usuario_id,
      ub.responsable,
      ub.username,
      'documentacion'::text AS modulo,
      n.id AS entidad_id,
      n.codigo::text AS codigo,
      private.fn_bloqueo_documental_nc(n.id)::text AS titulo,
      n.fecha_limite_cierre AS fecha_limite,
      CASE
        WHEN n.fecha_limite_cierre IS NULL THEN 'recordatorio'
        WHEN n.fecha_limite_cierre < v_hoy THEN 'vencido'
        WHEN n.fecha_limite_cierre = v_hoy THEN 'vencido_hoy'
        ELSE 'recordatorio'
      END AS nivel,
      CASE WHEN n.fecha_limite_cierre IS NULL THEN NULL ELSE (n.fecha_limite_cierre - v_hoy)::int END AS dias_restantes,
      ('/ncs/' || n.id::text)::text AS url_destino
    FROM public.no_conformidades n
    JOIN public.acciones a
      ON a.no_conformidad_id = n.id
     AND a.activo
     AND a.eliminado_en IS NULL
     AND a.estado <> 'cancelada'
     AND a.requiere_cambio_documental
    JOIN usuarios_base ub ON ub.id = a.responsable_id
    WHERE n.activo
      AND n.eliminado_en IS NULL
      AND n.estado NOT IN ('cerrada', 'aceptado_riesgo')
      AND private.fn_bloqueo_documental_nc(n.id) IS NOT NULL
  ),
  todos AS (
    SELECT pb.usuario_id, pb.responsable, pb.username, pb.modulo, pb.entidad_id, pb.codigo, pb.titulo, pb.fecha_limite, pb.nivel, pb.dias_restantes, pb.url_destino FROM pendientes_base pb
    UNION ALL SELECT c.usuario_id, c.responsable, c.username, c.modulo, c.entidad_id, c.codigo, c.titulo, c.fecha_limite, c.nivel, c.dias_restantes, c.url_destino FROM controles c
    UNION ALL SELECT tr.usuario_id, tr.responsable, tr.username, tr.modulo, tr.entidad_id, tr.codigo, tr.titulo, tr.fecha_limite, tr.nivel, tr.dias_restantes, tr.url_destino FROM tratamiento tr
    UNION ALL SELECT tsr.usuario_id, tsr.responsable, tsr.username, tsr.modulo, tsr.entidad_id, tsr.codigo, tsr.titulo, tsr.fecha_limite, tsr.nivel, tsr.dias_restantes, tsr.url_destino FROM tratamiento_sin_responsable tsr
    UNION ALL SELECT v.usuario_id, v.responsable, v.username, v.modulo, v.entidad_id, v.codigo, v.titulo, v.fecha_limite, v.nivel, v.dias_restantes, v.url_destino FROM verificaciones v
    UNION ALL SELECT ci.usuario_id, ci.responsable, ci.username, ci.modulo, ci.entidad_id, ci.codigo, ci.titulo, ci.fecha_limite, ci.nivel, ci.dias_restantes, ci.url_destino FROM cierres ci
    UNION ALL SELECT doc.usuario_id, doc.responsable, doc.username, doc.modulo, doc.entidad_id, doc.codigo, doc.titulo, doc.fecha_limite, doc.nivel, doc.dias_restantes, doc.url_destino FROM documentacion doc
  ),
  deduplicados AS (
    SELECT DISTINCT ON (COALESCE(t.usuario_id::text, 'sin_responsable'), t.modulo, t.entidad_id)
      t.usuario_id,
      t.responsable,
      t.username,
      t.modulo,
      t.entidad_id,
      t.codigo,
      t.titulo,
      t.fecha_limite,
      t.nivel,
      t.dias_restantes,
      t.url_destino
    FROM todos t
    ORDER BY
      COALESCE(t.usuario_id::text, 'sin_responsable'),
      t.modulo,
      t.entidad_id,
      CASE t.nivel WHEN 'vencido' THEN 0 WHEN 'vencido_hoy' THEN 1 WHEN 'advertencia' THEN 2 ELSE 3 END,
      t.dias_restantes NULLS LAST
  )
  SELECT
    d.usuario_id,
    d.responsable,
    d.username,
    d.modulo,
    d.entidad_id,
    d.codigo,
    d.titulo,
    d.fecha_limite,
    d.dias_restantes,
    d.nivel,
    d.url_destino
  FROM deduplicados d
  ORDER BY
    CASE d.nivel WHEN 'vencido' THEN 0 WHEN 'vencido_hoy' THEN 1 WHEN 'advertencia' THEN 2 ELSE 3 END,
    d.dias_restantes NULLS LAST,
    d.responsable,
    d.modulo,
    d.codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_tablero_pendientes_responsables(
  p_zona text DEFAULT 'America/Argentina/Buenos_Aires'
)
RETURNS TABLE(
  usuario_id uuid,
  responsable text,
  username text,
  total integer,
  vencidos integer,
  vencen_hoy integer,
  proximos integer,
  modulos text[],
  primer_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    d.usuario_id,
    d.responsable,
    d.username,
    count(*)::integer AS total,
    count(*) FILTER (WHERE d.nivel = 'vencido')::integer AS vencidos,
    count(*) FILTER (WHERE d.nivel = 'vencido_hoy')::integer AS vencen_hoy,
    count(*) FILTER (WHERE d.nivel IN ('advertencia', 'recordatorio'))::integer AS proximos,
    array_agg(DISTINCT d.modulo ORDER BY d.modulo) AS modulos,
    (array_agg(
      d.url_destino
      ORDER BY
        CASE d.nivel WHEN 'vencido' THEN 0 WHEN 'vencido_hoy' THEN 1 WHEN 'advertencia' THEN 2 ELSE 3 END,
        d.dias_restantes NULLS LAST,
        d.url_destino
    ))[1] AS primer_url
  FROM public.fn_tablero_pendientes_responsables_detalle(p_zona, NULL) d
  GROUP BY d.usuario_id, d.responsable, d.username
  ORDER BY 5 DESC, 6 DESC, 4 DESC, 2;
$$;

REVOKE ALL ON FUNCTION public.fn_tablero_pendientes_responsables_detalle(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_tablero_pendientes_responsables(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tablero_pendientes_responsables_detalle(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_tablero_pendientes_responsables(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
