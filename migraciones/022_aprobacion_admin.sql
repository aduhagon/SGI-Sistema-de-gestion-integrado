-- ============================================================================
-- Migración 022 — Aprobación administrativa (atajo de gestor)
-- ============================================================================
-- YA APLICADA en producción vía MCP el 14/06/2026. Respaldo para el repo.
--
-- Crea fn_aprobar_documento_admin: marca la última versión del documento como
-- aprobada + vigente, salteando el circuito formal de firmas. Para puesta en
-- marcha. El trigger fn_sincronizar_version_vigente (ya existente) se encarga de
-- obsoletar versiones anteriores y actualizar el documento maestro.
-- Requiere motivo (queda en motivo_cambio). Respeta el constraint
-- chk_versiones_aprobado_tiene_fecha (completa fecha_aprobado).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_aprobar_documento_admin(
  p_documento_id uuid,
  p_motivo text
)
RETURNS TABLE(aprobado boolean, version_id uuid, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario uuid;
  v_version_id uuid;
  v_estado_doc text;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida.';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'El motivo de la aprobación administrativa es obligatorio (mínimo 5 caracteres).';
  END IF;

  SELECT d.estado_actual INTO v_estado_doc
  FROM documentos d WHERE d.id = p_documento_id AND d.eliminado_en IS NULL;
  IF v_estado_doc IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Documento no encontrado.'; RETURN;
  END IF;
  IF v_estado_doc = 'obsoleto' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'El documento está obsoleto; no se puede aprobar.'; RETURN;
  END IF;

  SELECT v.id INTO v_version_id
  FROM versiones v
  WHERE v.documento_id = p_documento_id AND v.eliminado_en IS NULL
  ORDER BY v.numero_orden DESC LIMIT 1;
  IF v_version_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'El documento no tiene versiones para aprobar.'; RETURN;
  END IF;

  UPDATE versiones
  SET estado = 'aprobado',
      es_vigente = true,
      fecha_aprobado = COALESCE(fecha_aprobado, now()),
      fecha_vigencia_desde = COALESCE(fecha_vigencia_desde, current_date),
      motivo_cambio = COALESCE(NULLIF(motivo_cambio, ''), '') ||
        CASE WHEN COALESCE(motivo_cambio,'') = '' THEN '' ELSE ' | ' END ||
        'Aprobación administrativa: ' || trim(p_motivo)
  WHERE id = v_version_id;

  RETURN QUERY SELECT true, v_version_id, 'Documento aprobado y puesto vigente.';
END;
$function$;
