-- 047_fn_obsoletar_documento.sql
-- Función para marcar un documento como obsoleto (retirarlo de circulación).
-- Obsoleta la versión más reciente; el trigger fn_sincronizar_estado_documento
-- propaga el estado 'obsoleto' al documento maestro. Registra motivo + autor.
-- YA APLICADA en la base vía MCP. Este archivo es respaldo para el historial.

CREATE OR REPLACE FUNCTION public.fn_obsoletar_documento(p_documento_id uuid, p_motivo text)
RETURNS TABLE(obsoletado boolean, mensaje text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario uuid;
  v_version_id uuid;
  v_estado_doc documento_estado_enum;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida.';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'El motivo para obsoletar es obligatorio (mínimo 5 caracteres).';
  END IF;

  SELECT d.estado_actual INTO v_estado_doc
  FROM documentos d WHERE d.id = p_documento_id AND d.eliminado_en IS NULL;

  IF v_estado_doc IS NULL THEN
    RETURN QUERY SELECT false, 'Documento no encontrado.'; RETURN;
  END IF;

  IF v_estado_doc = 'obsoleto' THEN
    RETURN QUERY SELECT false, 'El documento ya está obsoleto.'; RETURN;
  END IF;

  SELECT v.id INTO v_version_id
  FROM versiones v
  WHERE v.documento_id = p_documento_id AND v.eliminado_en IS NULL AND v.activo = true
  ORDER BY v.numero_orden DESC LIMIT 1;

  IF v_version_id IS NULL THEN
    RETURN QUERY SELECT false, 'El documento no tiene versiones.'; RETURN;
  END IF;

  UPDATE versiones
  SET estado = 'obsoleto',
      es_vigente = false,
      fecha_vigencia_hasta = COALESCE(fecha_vigencia_hasta, current_date),
      actualizado_por = v_usuario
  WHERE id = v_version_id;

  UPDATE documentos
  SET estado_actual = 'obsoleto',
      motivo_obsolescencia = trim(p_motivo),
      obsoletado_en = now(),
      obsoletado_por = v_usuario,
      version_vigente_id = NULL,
      actualizado_por = v_usuario,
      actualizado_en = now()
  WHERE id = p_documento_id;

  RETURN QUERY SELECT true, 'Documento marcado como obsoleto.';
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_obsoletar_documento(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_obsoletar_documento(uuid, text) TO authenticated;
