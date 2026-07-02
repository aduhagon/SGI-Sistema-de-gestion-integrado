-- ============================================================================
-- 055: Fix RLS de hallazgos — responsable_tratamiento_id referencia PUESTOS,
-- no usuarios. La comparación con fn_usuario_id_actual() nunca matcheaba.
-- Se resuelve la cadena puesto → persona_puesto → usuario con una función
-- SECURITY DEFINER reutilizable.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_usuario_ocupa_puesto(p_puesto_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM persona_puesto pp
    JOIN usuarios u ON u.persona_id = pp.persona_id
    WHERE pp.puesto_id = p_puesto_id
      AND pp.vigente_hasta IS NULL
      AND u.auth_user_id = auth.uid() AND u.activo = true
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_ocupa_puesto(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_ocupa_puesto(uuid) TO authenticated;

DROP POLICY IF EXISTS hallazgos_select ON hallazgos;
CREATE POLICY hallazgos_select ON hallazgos FOR SELECT
USING (
  activo = true AND (
    (SELECT fn_usuario_es_auditor_o_sgi())
    OR (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
    OR detectado_por_usuario_id = (SELECT fn_usuario_id_actual())
    OR (responsable_tratamiento_id IS NOT NULL AND (SELECT fn_usuario_ocupa_puesto(responsable_tratamiento_id)))
    OR (
      proceso_id IS NOT NULL
      AND fn_usuario_participa_en_proceso(proceso_id, 'responsable_proceso'::rol_proceso_enum)
      AND EXISTS (
        SELECT 1 FROM auditorias a
        WHERE a.id = hallazgos.auditoria_id AND a.estado = 'cerrada'
      )
    )
  )
);

DROP POLICY IF EXISTS hallazgos_update ON hallazgos;
CREATE POLICY hallazgos_update ON hallazgos FOR UPDATE
USING (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (
    (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
    AND EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = hallazgos.auditoria_id AND a.estado = 'en_curso'
    )
  )
  OR (estado = 'en_tratamiento' AND responsable_tratamiento_id IS NOT NULL
      AND (SELECT fn_usuario_ocupa_puesto(responsable_tratamiento_id)))
  OR (
    (SELECT fn_usuario_es_auditor_o_sgi())
    AND EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = hallazgos.auditoria_id AND a.estado = 'cerrada'
    )
  )
)
WITH CHECK (true);
