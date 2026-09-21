-- Relaciones entre normas: marco principal, reglamentarias, complementarias y modificatorias.

DO $$
BEGIN
  CREATE TYPE public.norma_relacion_tipo_enum AS ENUM (
    'reglamenta',
    'complementa',
    'modifica',
    'sustituye',
    'deroga',
    'depende_de'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.normas_relaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_origen_id uuid NOT NULL REFERENCES public.normas(id) ON DELETE RESTRICT,
  norma_destino_id uuid NOT NULL REFERENCES public.normas(id) ON DELETE RESTRICT,
  tipo public.norma_relacion_tipo_enum NOT NULL,
  articulos_afectados text,
  observacion text,
  fuente_url text,
  vigente_desde date,
  vigente_hasta date,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT chk_normas_relaciones_distintas CHECK (norma_origen_id <> norma_destino_id),
  CONSTRAINT chk_normas_relaciones_vigencia CHECK (
    vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta >= vigente_desde
  ),
  CONSTRAINT chk_normas_relaciones_fuente CHECK (
    fuente_url IS NULL OR fuente_url ~* '^https?://'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_normas_relaciones_activas
  ON public.normas_relaciones (norma_origen_id, norma_destino_id, tipo)
  WHERE activo = true AND eliminado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_normas_relaciones_origen
  ON public.normas_relaciones (norma_origen_id)
  WHERE activo = true AND eliminado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_normas_relaciones_destino
  ON public.normas_relaciones (norma_destino_id)
  WHERE activo = true AND eliminado_en IS NULL;

ALTER TABLE public.normas_relaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS normas_relaciones_select ON public.normas_relaciones;
CREATE POLICY normas_relaciones_select
  ON public.normas_relaciones
  FOR SELECT
  TO authenticated
  USING (activo = true AND eliminado_en IS NULL);

DROP POLICY IF EXISTS normas_relaciones_insert ON public.normas_relaciones;
CREATE POLICY normas_relaciones_insert
  ON public.normas_relaciones
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.fn_usuario_es_auditor_o_sgi()));

DROP POLICY IF EXISTS normas_relaciones_update ON public.normas_relaciones;
CREATE POLICY normas_relaciones_update
  ON public.normas_relaciones
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.fn_usuario_es_auditor_o_sgi()))
  WITH CHECK ((SELECT public.fn_usuario_es_auditor_o_sgi()));

GRANT SELECT, INSERT, UPDATE ON public.normas_relaciones TO authenticated;
REVOKE DELETE ON public.normas_relaciones FROM authenticated, anon;

DROP TRIGGER IF EXISTS trg_normas_relaciones_actualizado ON public.normas_relaciones;
CREATE TRIGGER trg_normas_relaciones_actualizado
  BEFORE UPDATE ON public.normas_relaciones
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();

DROP TRIGGER IF EXISTS trg_normas_relaciones_auditoria ON public.normas_relaciones;
CREATE TRIGGER trg_normas_relaciones_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON public.normas_relaciones
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();

COMMENT ON TABLE public.normas_relaciones IS
  'Relaciones dirigidas entre normas. La interfaz deriva la lectura inversa sin duplicar registros.';
COMMENT ON COLUMN public.normas_relaciones.norma_origen_id IS
  'Sujeto de la relación: la norma que reglamenta, complementa, modifica, sustituye, deroga o depende.';
COMMENT ON COLUMN public.normas_relaciones.norma_destino_id IS
  'Objeto de la relación: norma sobre la cual actúa la norma origen.';
