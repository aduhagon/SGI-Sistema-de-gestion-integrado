-- ============================================================================
-- Migración 024 — Acuses pendientes por usuario
-- ============================================================================
-- YA APLICADA en producción vía MCP el 14/06/2026. Respaldo para el repo.
--
-- Crea fn_acuses_pendientes_por_usuario(): devuelve los acuses de lectura sin
-- firmar (fecha_acuse IS NULL), agrupados por usuario, con conteo de vencidos y
-- la lista de documentos pendientes como JSON. Para que el administrador
-- gestione y reclame la lectura.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_acuses_pendientes_por_usuario()
RETURNS TABLE(
  usuario_id uuid, username text, nombre_completo text, email text,
  total_pendientes int, vencidos int, acuses jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    u.id AS usuario_id,
    u.username,
    COALESCE(NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), ''), u.username) AS nombre_completo,
    per.email,
    COUNT(*)::int AS total_pendientes,
    COUNT(*) FILTER (WHERE al.plazo_objetivo IS NOT NULL AND al.plazo_objetivo < now())::int AS vencidos,
    jsonb_agg(
      jsonb_build_object(
        'acuse_id', al.id, 'documento_id', d.id, 'codigo', d.codigo,
        'titulo', d.titulo, 'numero_version', v.numero_version,
        'fecha_generacion', al.fecha_generacion, 'plazo_objetivo', al.plazo_objetivo,
        'vencido', (al.plazo_objetivo IS NOT NULL AND al.plazo_objetivo < now()),
        'recordatorios', al.cantidad_recordatorios
      ) ORDER BY al.plazo_objetivo NULLS LAST, d.codigo
    ) AS acuses
  FROM acuses_lectura al
  JOIN usuarios u ON u.id = al.usuario_id
  LEFT JOIN personas per ON per.id = u.persona_id
  JOIN versiones v ON v.id = al.version_id
  JOIN documentos d ON d.id = v.documento_id
  WHERE al.fecha_acuse IS NULL AND d.eliminado_en IS NULL
  GROUP BY u.id, u.username, per.nombre, per.apellido, per.email
  ORDER BY vencidos DESC, total_pendientes DESC, nombre_completo;
$function$;
