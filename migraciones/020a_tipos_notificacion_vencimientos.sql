-- ============================================================================
-- Migración 020a — Tipos de notificación para vencimientos
-- ============================================================================
-- Agrega los tipos nuevos al enum notificacion_tipo_enum.
-- IMPORTANTE: en PostgreSQL, ALTER TYPE ... ADD VALUE no puede ejecutarse dentro
-- del mismo bloque transaccional que luego usa el valor. Por eso esta migración
-- va SEPARADA de la función (020b). Corré 020a primero, confirmá, después 020b.
-- ============================================================================

ALTER TYPE notificacion_tipo_enum ADD VALUE IF NOT EXISTS 'documento_revision_proxima';
ALTER TYPE notificacion_tipo_enum ADD VALUE IF NOT EXISTS 'nc_vencida';
ALTER TYPE notificacion_tipo_enum ADD VALUE IF NOT EXISTS 'riesgo_revision_proxima';

-- 'acuse_pendiente' ya existe en el enum, se reutiliza para acuses vencidos.
