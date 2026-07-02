-- 051: Mitigantes de riesgo — vínculo estructurado riesgo ↔ documento / indicador / otro control
-- APLICADA en Supabase el 2026-07-01 vía MCP. Este archivo es la copia para versionado.
-- Decisiones: tipo 'otro' habilitado; RLS insert/update solo auditor/SGI (igual que riesgos);
-- grado_control sigue manual. FK a documentos (padre), no a versiones: el vínculo siempre
-- resuelve a la versión vigente. Unicidad parcial (eliminado_en IS NULL) para permitir
-- re-vincular tras una eliminación lógica.

CREATE TYPE riesgo_mitigante_tipo_enum AS ENUM ('documento','indicador','otro');

CREATE TABLE riesgo_mitigante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  riesgo_id uuid NOT NULL REFERENCES riesgos(id) ON DELETE RESTRICT,
  tipo_mitigante riesgo_mitigante_tipo_enum NOT NULL,
  documento_id uuid REFERENCES documentos(id) ON DELETE RESTRICT,
  indicador_id uuid REFERENCES indicadores(id) ON DELETE RESTRICT,
  descripcion text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT chk_riesgo_mitigante_coherencia CHECK (
    (tipo_mitigante = 'documento' AND documento_id IS NOT NULL AND indicador_id IS NULL)
    OR (tipo_mitigante = 'indicador' AND indicador_id IS NOT NULL AND documento_id IS NULL)
    OR (tipo_mitigante = 'otro' AND documento_id IS NULL AND indicador_id IS NULL AND descripcion IS NOT NULL AND length(btrim(descripcion)) >= 5)
  )
);

COMMENT ON TABLE riesgo_mitigante IS 'Controles/mitigantes vinculados a un riesgo: documento del SGI, indicador o control descrito en texto libre (tipo otro).';

CREATE UNIQUE INDEX uq_riesgo_mitigante_documento ON riesgo_mitigante (riesgo_id, documento_id) WHERE eliminado_en IS NULL AND documento_id IS NOT NULL;
CREATE UNIQUE INDEX uq_riesgo_mitigante_indicador ON riesgo_mitigante (riesgo_id, indicador_id) WHERE eliminado_en IS NULL AND indicador_id IS NOT NULL;
CREATE INDEX idx_riesgo_mitigante_riesgo ON riesgo_mitigante (riesgo_id) WHERE eliminado_en IS NULL;
CREATE INDEX idx_riesgo_mitigante_doc ON riesgo_mitigante (documento_id) WHERE documento_id IS NOT NULL AND eliminado_en IS NULL;
CREATE INDEX idx_riesgo_mitigante_ind ON riesgo_mitigante (indicador_id) WHERE indicador_id IS NOT NULL AND eliminado_en IS NULL;

CREATE TRIGGER trg_riesgo_mitigante_actualizado
BEFORE UPDATE ON riesgo_mitigante
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

ALTER TABLE riesgo_mitigante ENABLE ROW LEVEL SECURITY;

CREATE POLICY riesgo_mitigante_select ON riesgo_mitigante FOR SELECT USING (activo = true);
CREATE POLICY riesgo_mitigante_insert ON riesgo_mitigante FOR INSERT WITH CHECK ((SELECT fn_usuario_es_auditor_o_sgi()));
CREATE POLICY riesgo_mitigante_update ON riesgo_mitigante FOR UPDATE USING ((SELECT fn_usuario_es_auditor_o_sgi())) WITH CHECK ((SELECT fn_usuario_es_auditor_o_sgi()));
