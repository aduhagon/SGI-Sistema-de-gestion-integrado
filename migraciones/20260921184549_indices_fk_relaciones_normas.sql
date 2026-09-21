CREATE INDEX IF NOT EXISTS idx_normas_relaciones_creado_por
  ON public.normas_relaciones (creado_por);
CREATE INDEX IF NOT EXISTS idx_normas_relaciones_actualizado_por
  ON public.normas_relaciones (actualizado_por);
CREATE INDEX IF NOT EXISTS idx_normas_relaciones_eliminado_por
  ON public.normas_relaciones (eliminado_por);
