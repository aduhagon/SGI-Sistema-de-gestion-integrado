-- ============================================================================
-- Migración 021 — Obsoletar documentos en lote
-- ============================================================================
-- YA APLICADA en producción vía MCP el 14/06/2026. Respaldo para el repo.
--
-- Agrega columnas de trazabilidad de obsolescencia a nivel documento y la
-- función que marca documentos como obsoletos (discontinuados) en lote.
-- ============================================================================

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS motivo_obsolescencia text;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS obsoletado_en timestamptz;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS obsoletado_por uuid REFERENCES usuarios(id);

CREATE OR REPLACE FUNCTION public.fn_obsoletar_documentos(
  p_documento_ids uuid[],
  p_motivo text
)
RETURNS TABLE(obsoletados int, omitidos int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario uuid;
  v_obsoletados int := 0;
  v_total int;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida.';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'El motivo es obligatorio (mínimo 5 caracteres).';
  END IF;

  v_total := coalesce(array_length(p_documento_ids, 1), 0);
  IF v_total = 0 THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  WITH upd AS (
    UPDATE documentos d
    SET estado_actual = 'obsoleto',
        version_vigente_id = NULL,
        motivo_obsolescencia = trim(p_motivo),
        obsoletado_en = now(),
        obsoletado_por = v_usuario,
        actualizado_por = v_usuario
    WHERE d.id = ANY(p_documento_ids)
      AND d.activo
      AND d.eliminado_en IS NULL
      AND d.estado_actual <> 'obsoleto'
    RETURNING d.id
  )
  SELECT count(*) INTO v_obsoletados FROM upd;

  RETURN QUERY SELECT v_obsoletados, (v_total - v_obsoletados);
END;
$function$;
