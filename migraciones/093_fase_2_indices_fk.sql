-- SGI Multinorma - Fase 2: indices de apoyo para claves foraneas

BEGIN;

CREATE INDEX IF NOT EXISTS idx_requisito_proceso_responsable
  ON public.requisito_proceso(responsable_puesto_id)
  WHERE responsable_puesto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_proceso_creado_por
  ON public.requisito_proceso(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_proceso_actualizado_por
  ON public.requisito_proceso(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_proceso_eliminado_por
  ON public.requisito_proceso(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_controles_creado_por
  ON public.controles(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_controles_actualizado_por
  ON public.controles(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_controles_eliminado_por
  ON public.controles(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_control_riesgo_creado_por
  ON public.control_riesgo(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_riesgo_actualizado_por
  ON public.control_riesgo(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_riesgo_eliminado_por
  ON public.control_riesgo(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_control_requisito_creado_por
  ON public.control_requisito(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_requisito_actualizado_por
  ON public.control_requisito(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_requisito_eliminado_por
  ON public.control_requisito(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_control_documento_creado_por
  ON public.control_documento(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_documento_actualizado_por
  ON public.control_documento(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_documento_eliminado_por
  ON public.control_documento(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_control_indicador_creado_por
  ON public.control_indicador(creado_por) WHERE creado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_indicador_actualizado_por
  ON public.control_indicador(actualizado_por) WHERE actualizado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_indicador_eliminado_por
  ON public.control_indicador(eliminado_por) WHERE eliminado_por IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_control_ejecuciones_archivo
  ON public.control_ejecuciones(evidencia_archivo_id)
  WHERE evidencia_archivo_id IS NOT NULL;

COMMIT;

