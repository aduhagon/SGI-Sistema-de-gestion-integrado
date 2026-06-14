-- ============================================================================
-- Migración 023 — Fix aprobación admin: orden de vigencia
-- ============================================================================
-- YA APLICADA en producción vía MCP el 14/06/2026. Respaldo para el repo.
--
-- PROBLEMA: al aprobar una nueva versión de un documento que ya tenía una
-- versión vigente, saltaba:
--   duplicate key value violates unique constraint
--   "uq_versiones_una_vigente_por_documento"
-- (índice único parcial: un documento no puede tener 2 versiones con
--  es_vigente=true al mismo tiempo).
--
-- CAUSA: la función marcaba la nueva versión vigente ANTES de que la anterior
-- dejara de serlo, por lo que durante un instante había 2 vigentes -> choque.
--
-- FIX: la función ahora, en orden explícito:
--   1. Baja (obsoleta) la versión vigente anterior.
--   2. Recién después marca la nueva versión como vigente.
--   3. Sincroniza el documento maestro.
-- Así nunca hay 2 vigentes a la vez. No requiere cambios de frontend.
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
  WHERE v.documento_id = p_documento_id AND v.eliminado_en IS NULL AND v.activo = true
  ORDER BY v.numero_orden DESC LIMIT 1;
  IF v_version_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'El documento no tiene versiones para aprobar.'; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM versiones WHERE id = v_version_id AND es_vigente = true) THEN
    RETURN QUERY SELECT true, v_version_id, 'La versión ya estaba vigente.'; RETURN;
  END IF;

  -- PASO 1: bajar la vigente anterior (evita choque con el índice único).
  UPDATE versiones
  SET es_vigente = false, estado = 'obsoleto', fecha_vigencia_hasta = current_date
  WHERE documento_id = p_documento_id AND id <> v_version_id AND es_vigente = true;

  -- PASO 2: marcar la nueva como aprobada + vigente.
  UPDATE versiones
  SET estado = 'aprobado', es_vigente = true,
      fecha_aprobado = COALESCE(fecha_aprobado, now()),
      fecha_vigencia_desde = COALESCE(fecha_vigencia_desde, current_date),
      motivo_cambio = COALESCE(NULLIF(motivo_cambio, ''), '') ||
        CASE WHEN COALESCE(motivo_cambio,'') = '' THEN '' ELSE ' | ' END ||
        'Aprobación administrativa: ' || trim(p_motivo)
  WHERE id = v_version_id;

  -- PASO 3: sincronizar documento maestro.
  UPDATE documentos
  SET version_vigente_id = v_version_id, estado_actual = 'aprobado', actualizado_en = now()
  WHERE id = p_documento_id;

  RETURN QUERY SELECT true, v_version_id, 'Documento aprobado y puesto vigente.';
END;
$function$;
