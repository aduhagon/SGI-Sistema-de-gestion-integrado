-- ============================================================================
-- 053: Nuevos valores de enum para el flujo de auditoría en dos instancias.
-- Se separan en su propia migración porque un valor de enum agregado no puede
-- usarse dentro de la misma transacción en que se crea.
-- ============================================================================

ALTER TYPE auditoria_estado_enum ADD VALUE IF NOT EXISTS 'informe_emitido' BEFORE 'cerrada';
ALTER TYPE archivo_contexto_enum ADD VALUE IF NOT EXISTS 'adjunto_hallazgo';
