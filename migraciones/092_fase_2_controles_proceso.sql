-- SGI Multinorma - Fase 2: controles centrados en procesos
-- Crea una entidad Control reutilizable y la conecta con requisitos, riesgos,
-- documentos, indicadores, ejecuciones y aplicabilidad normativa por proceso.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Aplicabilidad explicita requisito -> proceso
-- ---------------------------------------------------------------------------

CREATE TABLE public.requisito_proceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisito_id uuid NOT NULL REFERENCES public.requisitos(id) ON DELETE RESTRICT,
  proceso_id uuid NOT NULL REFERENCES public.procesos(id) ON DELETE RESTRICT,
  aplicabilidad text NOT NULL DEFAULT 'aplica'
    CHECK (aplicabilidad IN ('aplica', 'no_aplica', 'pendiente')),
  origenes text[] NOT NULL DEFAULT ARRAY['manual']::text[]
    CHECK (
      cardinality(origenes) > 0
      AND origenes <@ ARRAY['manual', 'documento', 'control', 'auditoria']::text[]
    ),
  justificacion text,
  responsable_puesto_id uuid REFERENCES public.puestos(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_requisito_proceso UNIQUE (requisito_id, proceso_id),
  CONSTRAINT chk_requisito_proceso_baja CHECK (
    (activo = true AND eliminado_en IS NULL)
    OR (activo = false AND eliminado_en IS NOT NULL)
  )
);

COMMENT ON TABLE public.requisito_proceso IS
  'Aplicabilidad explicita de un requisito normativo a un proceso. Los origenes indican de donde surgio la relacion sin duplicarla.';

CREATE INDEX idx_requisito_proceso_proceso
  ON public.requisito_proceso(proceso_id, aplicabilidad)
  WHERE activo = true AND eliminado_en IS NULL;
CREATE INDEX idx_requisito_proceso_requisito
  ON public.requisito_proceso(requisito_id)
  WHERE activo = true AND eliminado_en IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Control como entidad reutilizable
-- ---------------------------------------------------------------------------

CREATE TABLE public.controles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  proceso_id uuid NOT NULL REFERENCES public.procesos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  descripcion text,
  objetivo text,
  tipo text NOT NULL DEFAULT 'preventivo'
    CHECK (tipo IN ('preventivo', 'detectivo', 'correctivo')),
  periodicidad text NOT NULL DEFAULT 'ad_hoc'
    CHECK (periodicidad IN (
      'diaria', 'semanal', 'quincenal', 'mensual', 'bimestral',
      'trimestral', 'semestral', 'anual', 'ad_hoc'
    )),
  responsable_puesto_id uuid REFERENCES public.puestos(id) ON DELETE SET NULL,
  instrucciones text,
  requiere_evidencia boolean NOT NULL DEFAULT true,
  anticipacion_dias integer NOT NULL DEFAULT 7
    CHECK (anticipacion_dias BETWEEN 0 AND 90),
  proxima_ejecucion date,
  ultima_ejecucion timestamptz,
  ultimo_resultado text
    CHECK (ultimo_resultado IS NULL OR ultimo_resultado IN ('efectivo', 'parcial', 'inefectivo', 'no_aplica')),
  estado text NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'suspendido', 'retirado')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_controles_codigo UNIQUE (codigo),
  CONSTRAINT chk_controles_codigo CHECK (codigo ~ '^[A-Z0-9][A-Z0-9_-]{1,29}$'),
  CONSTRAINT chk_controles_nombre CHECK (length(btrim(nombre)) BETWEEN 3 AND 200),
  CONSTRAINT chk_controles_programacion CHECK (
    periodicidad = 'ad_hoc' OR proxima_ejecucion IS NOT NULL
  ),
  CONSTRAINT chk_controles_baja CHECK (
    (activo = true AND eliminado_en IS NULL)
    OR (activo = false AND eliminado_en IS NOT NULL)
  )
);

COMMENT ON TABLE public.controles IS
  'Control operativo reutilizable. Se define una sola vez por proceso y se vincula a todos los riesgos, requisitos, documentos e indicadores que corresponda.';

CREATE INDEX idx_controles_proceso
  ON public.controles(proceso_id, estado)
  WHERE activo = true AND eliminado_en IS NULL;
CREATE INDEX idx_controles_responsable
  ON public.controles(responsable_puesto_id, proxima_ejecucion)
  WHERE activo = true AND eliminado_en IS NULL AND estado = 'activo';
CREATE INDEX idx_controles_proxima_ejecucion
  ON public.controles(proxima_ejecucion)
  WHERE activo = true AND eliminado_en IS NULL AND estado = 'activo';

CREATE TABLE public.control_riesgo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.controles(id) ON DELETE RESTRICT,
  riesgo_id uuid NOT NULL REFERENCES public.riesgos(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_control_riesgo UNIQUE (control_id, riesgo_id)
);

CREATE TABLE public.control_requisito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.controles(id) ON DELETE RESTRICT,
  requisito_id uuid NOT NULL REFERENCES public.requisitos(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_control_requisito UNIQUE (control_id, requisito_id)
);

CREATE TABLE public.control_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.controles(id) ON DELETE RESTRICT,
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_control_documento UNIQUE (control_id, documento_id)
);

CREATE TABLE public.control_indicador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.controles(id) ON DELETE RESTRICT,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  eliminado_en timestamptz,
  eliminado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  eliminado_motivo text,
  CONSTRAINT uq_control_indicador UNIQUE (control_id, indicador_id)
);

CREATE INDEX idx_control_riesgo_riesgo
  ON public.control_riesgo(riesgo_id)
  WHERE activo = true AND eliminado_en IS NULL;
CREATE INDEX idx_control_requisito_requisito
  ON public.control_requisito(requisito_id)
  WHERE activo = true AND eliminado_en IS NULL;
CREATE INDEX idx_control_documento_documento
  ON public.control_documento(documento_id)
  WHERE activo = true AND eliminado_en IS NULL;
CREATE INDEX idx_control_indicador_indicador
  ON public.control_indicador(indicador_id)
  WHERE activo = true AND eliminado_en IS NULL;

CREATE TABLE public.control_ejecuciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.controles(id) ON DELETE RESTRICT,
  fecha_programada date,
  fecha_ejecucion timestamptz NOT NULL DEFAULT now(),
  resultado text NOT NULL
    CHECK (resultado IN ('efectivo', 'parcial', 'inefectivo', 'no_aplica')),
  detalle text,
  evidencia_descripcion text,
  evidencia_archivo_id uuid REFERENCES public.archivos(id) ON DELETE RESTRICT,
  ejecutado_por uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_control_ejecucion_detalle CHECK (
    detalle IS NULL OR length(btrim(detalle)) BETWEEN 3 AND 4000
  ),
  CONSTRAINT chk_control_ejecucion_evidencia CHECK (
    evidencia_descripcion IS NULL
    OR length(btrim(evidencia_descripcion)) BETWEEN 5 AND 4000
  )
);

COMMENT ON TABLE public.control_ejecuciones IS
  'Registro inmutable de la ejecucion de un control. Cada fila es evidencia operativa y reprograma el siguiente vencimiento.';

CREATE UNIQUE INDEX uq_control_ejecucion_programada
  ON public.control_ejecuciones(control_id, fecha_programada)
  WHERE fecha_programada IS NOT NULL;
CREATE INDEX idx_control_ejecuciones_control_fecha
  ON public.control_ejecuciones(control_id, fecha_ejecucion DESC);
CREATE INDEX idx_control_ejecuciones_actor
  ON public.control_ejecuciones(ejecutado_por, fecha_ejecucion DESC);

-- ---------------------------------------------------------------------------
-- 3. Helpers de autorizacion y consistencia
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.fn_puede_gestionar_proceso(p_proceso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  SELECT
    private.fn_usuario_es_gestor_sgi()
    OR public.fn_usuario_participa_en_proceso(
      p_proceso_id,
      'responsable_proceso'::public.rol_proceso_enum
    )
    OR EXISTS (
      SELECT 1
      FROM public.asignaciones_rol_global arg
      JOIN public.roles_globales rg ON rg.id = arg.rol_id
      JOIN public.usuarios u ON u.id = arg.usuario_id
      WHERE u.auth_user_id = auth.uid()
        AND u.activo = true
        AND rg.activo = true
        AND rg.codigo = 'responsable_proceso_general'
        AND arg.vigente_hasta IS NULL
    );
$function$;

CREATE OR REPLACE FUNCTION private.fn_puede_gestionar_control(p_control_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.controles c
    WHERE c.id = p_control_id
      AND private.fn_puede_gestionar_proceso(c.proceso_id)
  );
$function$;

CREATE OR REPLACE FUNCTION private.fn_es_responsable_control(p_control_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.controles c
    JOIN public.persona_puesto pp
      ON pp.puesto_id = c.responsable_puesto_id
     AND pp.vigente_hasta IS NULL
    JOIN public.usuarios u ON u.persona_id = pp.persona_id
    WHERE c.id = p_control_id
      AND c.activo = true
      AND c.eliminado_en IS NULL
      AND u.activo = true
      AND u.auth_user_id = auth.uid()
  );
$function$;

REVOKE ALL ON FUNCTION private.fn_puede_gestionar_proceso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fn_puede_gestionar_control(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fn_es_responsable_control(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fn_puede_gestionar_proceso(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.fn_puede_gestionar_control(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.fn_es_responsable_control(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.fn_validar_control_riesgo_proceso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_control_proceso uuid;
  v_riesgo_proceso uuid;
BEGIN
  SELECT proceso_id INTO v_control_proceso FROM public.controles WHERE id = NEW.control_id;
  SELECT proceso_id INTO v_riesgo_proceso FROM public.riesgos WHERE id = NEW.riesgo_id;
  IF v_control_proceso IS NULL OR v_riesgo_proceso IS NULL OR v_control_proceso <> v_riesgo_proceso THEN
    RAISE EXCEPTION 'El control y el riesgo deben pertenecer al mismo proceso.';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.fn_validar_control_riesgo_proceso() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_validar_control_riesgo_proceso() TO service_role;

CREATE TRIGGER trg_control_riesgo_mismo_proceso
BEFORE INSERT OR UPDATE OF control_id, riesgo_id ON public.control_riesgo
FOR EACH ROW EXECUTE FUNCTION private.fn_validar_control_riesgo_proceso();

CREATE OR REPLACE FUNCTION private.fn_sumar_origen_requisito_proceso(
  p_requisito_id uuid,
  p_proceso_id uuid,
  p_origen text,
  p_actor uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.requisito_proceso (
    requisito_id, proceso_id, aplicabilidad, origenes, creado_por
  ) VALUES (
    p_requisito_id, p_proceso_id, 'aplica', ARRAY[p_origen], p_actor
  )
  ON CONFLICT (requisito_id, proceso_id) DO UPDATE
  SET activo = true,
      eliminado_en = NULL,
      eliminado_por = NULL,
      eliminado_motivo = NULL,
      aplicabilidad = CASE
        WHEN public.requisito_proceso.aplicabilidad = 'no_aplica'
          THEN public.requisito_proceso.aplicabilidad
        ELSE 'aplica'
      END,
      origenes = ARRAY(
        SELECT DISTINCT x
        FROM unnest(public.requisito_proceso.origenes || EXCLUDED.origenes) AS x
        ORDER BY x
      ),
      actualizado_en = now(),
      actualizado_por = COALESCE(p_actor, public.requisito_proceso.actualizado_por);
END;
$function$;

REVOKE ALL ON FUNCTION private.fn_sumar_origen_requisito_proceso(uuid,uuid,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_sumar_origen_requisito_proceso(uuid,uuid,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION private.fn_aplicabilidad_desde_control()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_proceso_id uuid;
BEGIN
  IF NEW.activo = true AND NEW.eliminado_en IS NULL THEN
    SELECT proceso_id INTO v_proceso_id FROM public.controles WHERE id = NEW.control_id;
    IF v_proceso_id IS NOT NULL THEN
      PERFORM private.fn_sumar_origen_requisito_proceso(
        NEW.requisito_id,
        v_proceso_id,
        'control',
        COALESCE(NEW.actualizado_por, NEW.creado_por, public.fn_usuario_id_actual())
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.fn_aplicabilidad_desde_cobertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_proceso_id uuid;
BEGIN
  IF NEW.activo = true AND NEW.eliminado_en IS NULL THEN
    SELECT proceso_principal_id INTO v_proceso_id
    FROM public.documentos
    WHERE id = NEW.documento_id;
    IF v_proceso_id IS NOT NULL THEN
      PERFORM private.fn_sumar_origen_requisito_proceso(
        NEW.requisito_id,
        v_proceso_id,
        'documento',
        COALESCE(NEW.actualizado_por, NEW.creado_por, public.fn_usuario_id_actual())
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.fn_aplicabilidad_desde_control() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.fn_aplicabilidad_desde_cobertura() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_aplicabilidad_desde_control() TO service_role;
GRANT EXECUTE ON FUNCTION private.fn_aplicabilidad_desde_cobertura() TO service_role;

CREATE TRIGGER trg_control_requisito_aplicabilidad
AFTER INSERT OR UPDATE OF activo, eliminado_en, requisito_id, control_id
ON public.control_requisito
FOR EACH ROW EXECUTE FUNCTION private.fn_aplicabilidad_desde_control();

DROP TRIGGER IF EXISTS trg_cobertura_aplicabilidad_proceso ON public.coberturas;
CREATE TRIGGER trg_cobertura_aplicabilidad_proceso
AFTER INSERT OR UPDATE OF activo, eliminado_en, requisito_id, documento_id
ON public.coberturas
FOR EACH ROW EXECUTE FUNCTION private.fn_aplicabilidad_desde_cobertura();

CREATE OR REPLACE FUNCTION private.fn_reprogramar_control()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_periodicidad text;
  v_base date;
  v_proxima date;
BEGIN
  SELECT periodicidad INTO v_periodicidad
  FROM public.controles
  WHERE id = NEW.control_id
  FOR UPDATE;

  v_base := GREATEST(COALESCE(NEW.fecha_programada, NEW.fecha_ejecucion::date), current_date);
  v_proxima := CASE v_periodicidad
    WHEN 'diaria' THEN v_base + 1
    WHEN 'semanal' THEN v_base + 7
    WHEN 'quincenal' THEN v_base + 15
    WHEN 'mensual' THEN (v_base + interval '1 month')::date
    WHEN 'bimestral' THEN (v_base + interval '2 months')::date
    WHEN 'trimestral' THEN (v_base + interval '3 months')::date
    WHEN 'semestral' THEN (v_base + interval '6 months')::date
    WHEN 'anual' THEN (v_base + interval '1 year')::date
    ELSE NULL
  END;

  UPDATE public.controles
  SET ultima_ejecucion = NEW.fecha_ejecucion,
      ultimo_resultado = NEW.resultado,
      proxima_ejecucion = v_proxima,
      actualizado_en = now(),
      actualizado_por = NEW.ejecutado_por
  WHERE id = NEW.control_id;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.fn_reprogramar_control() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_reprogramar_control() TO service_role;

CREATE TRIGGER trg_control_ejecucion_reprogramar
AFTER INSERT ON public.control_ejecuciones
FOR EACH ROW EXECUTE FUNCTION private.fn_reprogramar_control();

-- ---------------------------------------------------------------------------
-- 4. RLS y privilegios explicitos para Data API
-- ---------------------------------------------------------------------------

ALTER TABLE public.requisito_proceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_riesgo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_requisito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_indicador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_ejecuciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY requisito_proceso_select ON public.requisito_proceso
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY requisito_proceso_insert ON public.requisito_proceso
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_proceso(proceso_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY requisito_proceso_update ON public.requisito_proceso
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_proceso(proceso_id))
WITH CHECK (private.fn_puede_gestionar_proceso(proceso_id));

CREATE POLICY controles_select ON public.controles
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY controles_insert ON public.controles
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_proceso(proceso_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY controles_update ON public.controles
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_proceso(proceso_id))
WITH CHECK (private.fn_puede_gestionar_proceso(proceso_id));

CREATE POLICY control_riesgo_select ON public.control_riesgo
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY control_riesgo_insert ON public.control_riesgo
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_control(control_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY control_riesgo_update ON public.control_riesgo
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_control(control_id))
WITH CHECK (private.fn_puede_gestionar_control(control_id));

CREATE POLICY control_requisito_select ON public.control_requisito
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY control_requisito_insert ON public.control_requisito
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_control(control_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY control_requisito_update ON public.control_requisito
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_control(control_id))
WITH CHECK (private.fn_puede_gestionar_control(control_id));

CREATE POLICY control_documento_select ON public.control_documento
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY control_documento_insert ON public.control_documento
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_control(control_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY control_documento_update ON public.control_documento
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_control(control_id))
WITH CHECK (private.fn_puede_gestionar_control(control_id));

CREATE POLICY control_indicador_select ON public.control_indicador
FOR SELECT TO authenticated
USING (activo = true AND eliminado_en IS NULL);
CREATE POLICY control_indicador_insert ON public.control_indicador
FOR INSERT TO authenticated
WITH CHECK (
  private.fn_puede_gestionar_control(control_id)
  AND creado_por = public.fn_usuario_id_actual()
);
CREATE POLICY control_indicador_update ON public.control_indicador
FOR UPDATE TO authenticated
USING (private.fn_puede_gestionar_control(control_id))
WITH CHECK (private.fn_puede_gestionar_control(control_id));

CREATE POLICY control_ejecuciones_select ON public.control_ejecuciones
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.controles c
    WHERE c.id = control_ejecuciones.control_id
      AND c.activo = true AND c.eliminado_en IS NULL
  )
);
CREATE POLICY control_ejecuciones_insert ON public.control_ejecuciones
FOR INSERT TO authenticated
WITH CHECK (
  ejecutado_por = public.fn_usuario_id_actual()
  AND (
    private.fn_puede_gestionar_control(control_id)
    OR private.fn_es_responsable_control(control_id)
  )
);

REVOKE ALL ON TABLE public.requisito_proceso FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.controles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.control_riesgo FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.control_requisito FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.control_documento FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.control_indicador FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.control_ejecuciones FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.requisito_proceso TO authenticated;
GRANT SELECT ON TABLE public.controles TO authenticated;
GRANT SELECT ON TABLE public.control_riesgo TO authenticated;
GRANT SELECT ON TABLE public.control_requisito TO authenticated;
GRANT SELECT ON TABLE public.control_documento TO authenticated;
GRANT SELECT ON TABLE public.control_indicador TO authenticated;
GRANT SELECT ON TABLE public.control_ejecuciones TO authenticated;

GRANT ALL ON TABLE public.requisito_proceso TO service_role;
GRANT ALL ON TABLE public.controles TO service_role;
GRANT ALL ON TABLE public.control_riesgo TO service_role;
GRANT ALL ON TABLE public.control_requisito TO service_role;
GRANT ALL ON TABLE public.control_documento TO service_role;
GRANT ALL ON TABLE public.control_indicador TO service_role;
GRANT ALL ON TABLE public.control_ejecuciones TO service_role;

-- ---------------------------------------------------------------------------
-- 5. RPC atomicas para la aplicacion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guardar_control(
  p_id uuid,
  p_codigo text,
  p_proceso_id uuid,
  p_nombre text,
  p_descripcion text,
  p_objetivo text,
  p_tipo text,
  p_periodicidad text,
  p_responsable_puesto_id uuid,
  p_instrucciones text,
  p_requiere_evidencia boolean,
  p_anticipacion_dias integer,
  p_proxima_ejecucion date,
  p_estado text,
  p_riesgo_ids uuid[],
  p_requisito_ids uuid[],
  p_documento_ids uuid[],
  p_indicador_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_actor uuid;
  v_now timestamptz := now();
  v_ids uuid[];
BEGIN
  v_actor := public.fn_usuario_id_actual();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sesion no valida.';
  END IF;
  IF NOT private.fn_puede_gestionar_proceso(p_proceso_id) THEN
    RAISE EXCEPTION 'No tiene permisos para gestionar controles de este proceso.';
  END IF;
  IF p_id IS NOT NULL AND NOT private.fn_puede_gestionar_control(p_id) THEN
    RAISE EXCEPTION 'No tiene permisos para modificar este control.';
  END IF;
  IF p_periodicidad <> 'ad_hoc' AND p_proxima_ejecucion IS NULL THEN
    RAISE EXCEPTION 'Los controles periodicos requieren una proxima ejecucion.';
  END IF;
  IF cardinality(COALESCE(p_riesgo_ids, '{}'::uuid[])) = 0
     AND cardinality(COALESCE(p_requisito_ids, '{}'::uuid[])) = 0 THEN
    RAISE EXCEPTION 'El control debe vincular al menos un riesgo o requisito.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_riesgo_ids, '{}'::uuid[])) AS x(id)
    LEFT JOIN public.riesgos r ON r.id = x.id
    WHERE r.id IS NULL OR r.proceso_id <> p_proceso_id
      OR r.activo = false OR r.eliminado_en IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Todos los riesgos vinculados deben estar activos y pertenecer al proceso del control.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_requisito_ids, '{}'::uuid[])) AS x(id)
    LEFT JOIN public.requisitos r ON r.id = x.id
    WHERE r.id IS NULL OR r.activo = false OR r.eliminado_en IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Todos los requisitos vinculados deben estar activos.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_documento_ids, '{}'::uuid[])) AS x(id)
    LEFT JOIN public.documentos d ON d.id = x.id
    WHERE d.id IS NULL OR d.activo = false OR d.eliminado_en IS NOT NULL
      OR d.estado_actual <> 'aprobado'::public.documento_estado_enum
  ) THEN
    RAISE EXCEPTION 'Todos los documentos vinculados deben estar activos y aprobados.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_indicador_ids, '{}'::uuid[])) AS x(id)
    LEFT JOIN public.indicadores i ON i.id = x.id
    WHERE i.id IS NULL OR i.activo = false OR i.eliminado_en IS NOT NULL
      OR i.proceso_id <> p_proceso_id
  ) THEN
    RAISE EXCEPTION 'Todos los indicadores vinculados deben estar activos y pertenecer al proceso del control.';
  END IF;
  IF p_responsable_puesto_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.puestos p
    WHERE p.id = p_responsable_puesto_id
      AND p.activo = true AND p.eliminado_en IS NULL
  ) THEN
    RAISE EXCEPTION 'El puesto responsable no existe o esta inactivo.';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.controles (
      codigo, proceso_id, nombre, descripcion, objetivo, tipo, periodicidad,
      responsable_puesto_id, instrucciones, requiere_evidencia,
      anticipacion_dias, proxima_ejecucion, estado, creado_por
    ) VALUES (
      upper(btrim(p_codigo)), p_proceso_id, btrim(p_nombre), nullif(btrim(p_descripcion), ''),
      nullif(btrim(p_objetivo), ''), p_tipo, p_periodicidad,
      p_responsable_puesto_id, nullif(btrim(p_instrucciones), ''), p_requiere_evidencia,
      p_anticipacion_dias, p_proxima_ejecucion, p_estado, v_actor
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.controles
    SET codigo = upper(btrim(p_codigo)),
        proceso_id = p_proceso_id,
        nombre = btrim(p_nombre),
        descripcion = nullif(btrim(p_descripcion), ''),
        objetivo = nullif(btrim(p_objetivo), ''),
        tipo = p_tipo,
        periodicidad = p_periodicidad,
        responsable_puesto_id = p_responsable_puesto_id,
        instrucciones = nullif(btrim(p_instrucciones), ''),
        requiere_evidencia = p_requiere_evidencia,
        anticipacion_dias = p_anticipacion_dias,
        proxima_ejecucion = p_proxima_ejecucion,
        estado = p_estado,
        actualizado_en = v_now,
        actualizado_por = v_actor
    WHERE id = p_id AND activo = true AND eliminado_en IS NULL
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Control no encontrado o sin permisos.';
    END IF;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x.id), '{}'::uuid[])
    INTO v_ids FROM unnest(COALESCE(p_riesgo_ids, '{}'::uuid[])) AS x(id);
  UPDATE public.control_riesgo
  SET activo = false, eliminado_en = v_now, eliminado_por = v_actor,
      eliminado_motivo = 'Desvinculado desde la ficha del control',
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE control_id = v_id AND activo = true AND eliminado_en IS NULL
    AND NOT (riesgo_id = ANY(v_ids));
  INSERT INTO public.control_riesgo(control_id, riesgo_id, creado_por)
  SELECT v_id, x.id, v_actor FROM unnest(v_ids) AS x(id)
  ON CONFLICT (control_id, riesgo_id) DO UPDATE
  SET activo = true, eliminado_en = NULL, eliminado_por = NULL, eliminado_motivo = NULL,
      actualizado_en = v_now, actualizado_por = v_actor;

  SELECT COALESCE(array_agg(DISTINCT x.id), '{}'::uuid[])
    INTO v_ids FROM unnest(COALESCE(p_requisito_ids, '{}'::uuid[])) AS x(id);
  UPDATE public.control_requisito
  SET activo = false, eliminado_en = v_now, eliminado_por = v_actor,
      eliminado_motivo = 'Desvinculado desde la ficha del control',
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE control_id = v_id AND activo = true AND eliminado_en IS NULL
    AND NOT (requisito_id = ANY(v_ids));
  INSERT INTO public.control_requisito(control_id, requisito_id, creado_por)
  SELECT v_id, x.id, v_actor FROM unnest(v_ids) AS x(id)
  ON CONFLICT (control_id, requisito_id) DO UPDATE
  SET activo = true, eliminado_en = NULL, eliminado_por = NULL, eliminado_motivo = NULL,
      actualizado_en = v_now, actualizado_por = v_actor;

  SELECT COALESCE(array_agg(DISTINCT x.id), '{}'::uuid[])
    INTO v_ids FROM unnest(COALESCE(p_documento_ids, '{}'::uuid[])) AS x(id);
  UPDATE public.control_documento
  SET activo = false, eliminado_en = v_now, eliminado_por = v_actor,
      eliminado_motivo = 'Desvinculado desde la ficha del control',
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE control_id = v_id AND activo = true AND eliminado_en IS NULL
    AND NOT (documento_id = ANY(v_ids));
  INSERT INTO public.control_documento(control_id, documento_id, creado_por)
  SELECT v_id, x.id, v_actor FROM unnest(v_ids) AS x(id)
  ON CONFLICT (control_id, documento_id) DO UPDATE
  SET activo = true, eliminado_en = NULL, eliminado_por = NULL, eliminado_motivo = NULL,
      actualizado_en = v_now, actualizado_por = v_actor;

  SELECT COALESCE(array_agg(DISTINCT x.id), '{}'::uuid[])
    INTO v_ids FROM unnest(COALESCE(p_indicador_ids, '{}'::uuid[])) AS x(id);
  UPDATE public.control_indicador
  SET activo = false, eliminado_en = v_now, eliminado_por = v_actor,
      eliminado_motivo = 'Desvinculado desde la ficha del control',
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE control_id = v_id AND activo = true AND eliminado_en IS NULL
    AND NOT (indicador_id = ANY(v_ids));
  INSERT INTO public.control_indicador(control_id, indicador_id, creado_por)
  SELECT v_id, x.id, v_actor FROM unnest(v_ids) AS x(id)
  ON CONFLICT (control_id, indicador_id) DO UPDATE
  SET activo = true, eliminado_en = NULL, eliminado_por = NULL, eliminado_motivo = NULL,
      actualizado_en = v_now, actualizado_por = v_actor;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sincronizar_controles_riesgo(
  p_riesgo_id uuid,
  p_control_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := public.fn_usuario_id_actual();
  v_proceso_id uuid;
  v_ids uuid[];
  v_now timestamptz := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Sesion no valida.'; END IF;

  SELECT proceso_id INTO v_proceso_id
  FROM public.riesgos
  WHERE id = p_riesgo_id AND activo = true AND eliminado_en IS NULL;
  IF v_proceso_id IS NULL THEN RAISE EXCEPTION 'Riesgo no encontrado o inactivo.'; END IF;
  IF NOT private.fn_puede_gestionar_proceso(v_proceso_id) THEN
    RAISE EXCEPTION 'No tiene permisos para gestionar controles de este proceso.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x.id), '{}'::uuid[])
    INTO v_ids FROM unnest(COALESCE(p_control_ids, '{}'::uuid[])) AS x(id);
  IF EXISTS (
    SELECT 1 FROM unnest(v_ids) AS x(id)
    LEFT JOIN public.controles c ON c.id = x.id
    WHERE c.id IS NULL OR c.proceso_id <> v_proceso_id
      OR c.activo = false OR c.eliminado_en IS NOT NULL OR c.estado <> 'activo'
  ) THEN
    RAISE EXCEPTION 'Todos los controles deben estar activos y pertenecer al proceso del riesgo.';
  END IF;

  UPDATE public.control_riesgo
  SET activo = false, eliminado_en = v_now, eliminado_por = v_actor,
      eliminado_motivo = 'Desvinculado desde la ficha del riesgo',
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE riesgo_id = p_riesgo_id AND activo = true AND eliminado_en IS NULL
    AND NOT (control_id = ANY(v_ids));

  INSERT INTO public.control_riesgo(control_id, riesgo_id, creado_por)
  SELECT x.id, p_riesgo_id, v_actor FROM unnest(v_ids) AS x(id)
  ON CONFLICT (control_id, riesgo_id) DO UPDATE
  SET activo = true, eliminado_en = NULL, eliminado_por = NULL, eliminado_motivo = NULL,
      actualizado_en = v_now, actualizado_por = v_actor;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_desactivar_control(
  p_control_id uuid,
  p_motivo text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := public.fn_usuario_id_actual();
  v_now timestamptz := now();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Sesion no valida.'; END IF;
  IF length(btrim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'El motivo de baja debe tener al menos 5 caracteres.';
  END IF;
  IF NOT private.fn_puede_gestionar_control(p_control_id) THEN
    RAISE EXCEPTION 'No tiene permisos para retirar este control.';
  END IF;

  UPDATE public.controles
  SET activo = false, estado = 'retirado', eliminado_en = v_now,
      eliminado_por = v_actor, eliminado_motivo = btrim(p_motivo),
      actualizado_en = v_now, actualizado_por = v_actor
  WHERE id = p_control_id AND activo = true AND eliminado_en IS NULL;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.control_riesgo SET activo=false, eliminado_en=v_now, eliminado_por=v_actor,
    eliminado_motivo='Baja del control', actualizado_en=v_now, actualizado_por=v_actor
    WHERE control_id=p_control_id AND activo=true AND eliminado_en IS NULL;
  UPDATE public.control_requisito SET activo=false, eliminado_en=v_now, eliminado_por=v_actor,
    eliminado_motivo='Baja del control', actualizado_en=v_now, actualizado_por=v_actor
    WHERE control_id=p_control_id AND activo=true AND eliminado_en IS NULL;
  UPDATE public.control_documento SET activo=false, eliminado_en=v_now, eliminado_por=v_actor,
    eliminado_motivo='Baja del control', actualizado_en=v_now, actualizado_por=v_actor
    WHERE control_id=p_control_id AND activo=true AND eliminado_en IS NULL;
  UPDATE public.control_indicador SET activo=false, eliminado_en=v_now, eliminado_por=v_actor,
    eliminado_motivo='Baja del control', actualizado_en=v_now, actualizado_por=v_actor
    WHERE control_id=p_control_id AND activo=true AND eliminado_en IS NULL;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_registrar_ejecucion_control(
  p_control_id uuid,
  p_resultado text,
  p_detalle text,
  p_evidencia_descripcion text,
  p_fecha_programada date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := public.fn_usuario_id_actual();
  v_id uuid;
  v_requiere_evidencia boolean;
  v_periodicidad text;
  v_proxima_ejecucion date;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Sesion no valida.'; END IF;
  IF p_resultado IS NULL OR p_resultado NOT IN ('efectivo', 'parcial', 'inefectivo', 'no_aplica') THEN
    RAISE EXCEPTION 'Resultado de control invalido.';
  END IF;
  IF NOT (
    private.fn_puede_gestionar_control(p_control_id)
    OR private.fn_es_responsable_control(p_control_id)
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para ejecutar este control.';
  END IF;
  SELECT requiere_evidencia, periodicidad, proxima_ejecucion
    INTO v_requiere_evidencia, v_periodicidad, v_proxima_ejecucion
  FROM public.controles
  WHERE id = p_control_id AND activo = true AND eliminado_en IS NULL AND estado = 'activo';
  IF v_requiere_evidencia IS NULL THEN RAISE EXCEPTION 'Control no encontrado o inactivo.'; END IF;
  IF v_periodicidad <> 'ad_hoc' AND p_fecha_programada IS DISTINCT FROM v_proxima_ejecucion THEN
    RAISE EXCEPTION 'La fecha programada no coincide con el vencimiento pendiente del control.';
  END IF;
  IF v_requiere_evidencia AND length(btrim(COALESCE(p_evidencia_descripcion, ''))) < 5 THEN
    RAISE EXCEPTION 'Este control requiere describir la evidencia de ejecucion.';
  END IF;

  INSERT INTO public.control_ejecuciones(
    control_id, fecha_programada, resultado, detalle,
    evidencia_descripcion, ejecutado_por
  ) VALUES (
    p_control_id, p_fecha_programada, p_resultado,
    nullif(btrim(p_detalle), ''),
    nullif(btrim(p_evidencia_descripcion), ''), v_actor
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_guardar_control(
  uuid,text,uuid,text,text,text,text,text,uuid,text,boolean,integer,date,text,uuid[],uuid[],uuid[],uuid[]
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sincronizar_controles_riesgo(uuid,uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_desactivar_control(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_registrar_ejecucion_control(uuid,text,text,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_guardar_control(
  uuid,text,uuid,text,text,text,text,text,uuid,text,boolean,integer,date,text,uuid[],uuid[],uuid[],uuid[]
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sincronizar_controles_riesgo(uuid,uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_desactivar_control(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_registrar_ejecucion_control(uuid,text,text,text,date)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Timestamps, auditoria e inmutabilidad de ejecuciones
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_requisito_proceso_actualizado
BEFORE UPDATE ON public.requisito_proceso
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();
CREATE TRIGGER trg_controles_actualizado
BEFORE UPDATE ON public.controles
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();
CREATE TRIGGER trg_control_riesgo_actualizado
BEFORE UPDATE ON public.control_riesgo
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();
CREATE TRIGGER trg_control_requisito_actualizado
BEFORE UPDATE ON public.control_requisito
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();
CREATE TRIGGER trg_control_documento_actualizado
BEFORE UPDATE ON public.control_documento
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();
CREATE TRIGGER trg_control_indicador_actualizado
BEFORE UPDATE ON public.control_indicador
FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();

CREATE TRIGGER trg_auditoria_requisito_proceso
AFTER INSERT OR UPDATE ON public.requisito_proceso
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_controles
AFTER INSERT OR UPDATE ON public.controles
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_control_riesgo
AFTER INSERT OR UPDATE ON public.control_riesgo
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_control_requisito
AFTER INSERT OR UPDATE ON public.control_requisito
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_control_documento
AFTER INSERT OR UPDATE ON public.control_documento
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_control_indicador
AFTER INSERT OR UPDATE ON public.control_indicador
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();
CREATE TRIGGER trg_auditoria_control_ejecuciones
AFTER INSERT ON public.control_ejecuciones
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_automatica();

-- Sin privilegios UPDATE/DELETE y sin politicas para esas operaciones, las
-- ejecuciones quedan inmutables incluso para un usuario autenticado.
REVOKE UPDATE, DELETE ON TABLE public.control_ejecuciones FROM authenticated;

-- ---------------------------------------------------------------------------
-- 7. Migracion de datos existentes y backfill de aplicabilidad
-- ---------------------------------------------------------------------------

ALTER TABLE public.riesgo_mitigante
  ADD COLUMN IF NOT EXISTS control_id uuid REFERENCES public.controles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_riesgo_mitigante_control
  ON public.riesgo_mitigante(control_id)
  WHERE control_id IS NOT NULL;

DO $migrate$
DECLARE
  v_legacy record;
  v_control_id uuid;
  v_nombre text;
BEGIN
  FOR v_legacy IN
    SELECT rm.*, r.proceso_id, r.responsable_id,
           d.codigo AS documento_codigo, d.titulo AS documento_titulo,
           i.codigo AS indicador_codigo, i.nombre AS indicador_nombre
    FROM public.riesgo_mitigante rm
    JOIN public.riesgos r ON r.id = rm.riesgo_id
    LEFT JOIN public.documentos d ON d.id = rm.documento_id
    LEFT JOIN public.indicadores i ON i.id = rm.indicador_id
    WHERE rm.activo = true AND rm.eliminado_en IS NULL AND rm.control_id IS NULL
    ORDER BY rm.creado_en, rm.id
  LOOP
    v_nombre := CASE v_legacy.tipo_mitigante::text
      WHEN 'documento' THEN 'Control documental ' || COALESCE(v_legacy.documento_codigo, 'sin codigo')
      WHEN 'indicador' THEN 'Seguimiento ' || COALESCE(v_legacy.indicador_codigo, 'sin codigo')
      ELSE COALESCE(NULLIF(btrim(v_legacy.descripcion), ''), 'Control migrado')
    END;

    INSERT INTO public.controles(
      codigo, proceso_id, nombre, descripcion, tipo, periodicidad,
      responsable_puesto_id, requiere_evidencia, anticipacion_dias,
      proxima_ejecucion, estado, creado_en, creado_por
    ) VALUES (
      'CTL-LEG-' || upper(substr(replace(v_legacy.id::text, '-', ''), 1, 12)),
      v_legacy.proceso_id,
      left(v_nombre, 200),
      CASE
        WHEN v_legacy.tipo_mitigante::text = 'otro' THEN v_legacy.descripcion
        WHEN v_legacy.tipo_mitigante::text = 'documento' THEN v_legacy.documento_titulo
        ELSE v_legacy.indicador_nombre
      END,
      'preventivo', 'ad_hoc', v_legacy.responsable_id, false, 7,
      NULL, 'activo', v_legacy.creado_en, v_legacy.creado_por
    ) RETURNING id INTO v_control_id;

    UPDATE public.riesgo_mitigante SET control_id = v_control_id WHERE id = v_legacy.id;
    INSERT INTO public.control_riesgo(control_id, riesgo_id, creado_en, creado_por)
      VALUES (v_control_id, v_legacy.riesgo_id, v_legacy.creado_en, v_legacy.creado_por);

    IF v_legacy.documento_id IS NOT NULL THEN
      INSERT INTO public.control_documento(control_id, documento_id, creado_en, creado_por)
        VALUES (v_control_id, v_legacy.documento_id, v_legacy.creado_en, v_legacy.creado_por);
      INSERT INTO public.control_requisito(control_id, requisito_id, creado_en, creado_por)
      SELECT v_control_id, c.requisito_id, v_legacy.creado_en, v_legacy.creado_por
      FROM public.coberturas c
      WHERE c.documento_id = v_legacy.documento_id
        AND c.activo = true AND c.eliminado_en IS NULL
      ON CONFLICT (control_id, requisito_id) DO NOTHING;
    END IF;

    IF v_legacy.indicador_id IS NOT NULL THEN
      INSERT INTO public.control_indicador(control_id, indicador_id, creado_en, creado_por)
        VALUES (v_control_id, v_legacy.indicador_id, v_legacy.creado_en, v_legacy.creado_por);
    END IF;
  END LOOP;
END;
$migrate$;

INSERT INTO public.requisito_proceso(
  requisito_id, proceso_id, aplicabilidad, origenes, creado_por
)
SELECT DISTINCT c.requisito_id, d.proceso_principal_id, 'aplica', ARRAY['documento']::text[], c.creado_por
FROM public.coberturas c
JOIN public.documentos d ON d.id = c.documento_id
WHERE c.activo = true AND c.eliminado_en IS NULL
  AND d.activo = true AND d.eliminado_en IS NULL
ON CONFLICT (requisito_id, proceso_id) DO UPDATE
SET activo = true,
    eliminado_en = NULL,
    eliminado_por = NULL,
    eliminado_motivo = NULL,
    origenes = ARRAY(
      SELECT DISTINCT x
      FROM unnest(public.requisito_proceso.origenes || EXCLUDED.origenes) AS x
      ORDER BY x
    ),
    actualizado_en = now();

COMMENT ON COLUMN public.riesgo_mitigante.control_id IS
  'Control de Fase 2 creado a partir del mitigante legacy. La tabla riesgo_mitigante queda solo para compatibilidad y rollback.';

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 8. Guardas de la migracion
-- ---------------------------------------------------------------------------

DO $assert$
DECLARE
  v_table text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'controles' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'controles debe tener RLS habilitado.';
  END IF;
  IF has_table_privilege('anon', 'public.controles', 'SELECT') THEN
    RAISE EXCEPTION 'anon no debe leer controles.';
  END IF;
  IF has_function_privilege(
    'anon',
    'public.fn_guardar_control(uuid,text,uuid,text,text,text,text,text,uuid,text,boolean,integer,date,text,uuid[],uuid[],uuid[],uuid[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon no debe ejecutar fn_guardar_control.';
  END IF;
  IF has_function_privilege(
    'anon',
    'public.fn_sincronizar_controles_riesgo(uuid,uuid[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon no debe vincular controles y riesgos.';
  END IF;
  FOREACH v_table IN ARRAY ARRAY[
    'requisito_proceso', 'controles', 'control_riesgo', 'control_requisito',
    'control_documento', 'control_indicador', 'control_ejecuciones'
  ] LOOP
    IF has_table_privilege('authenticated', format('public.%I', v_table), 'INSERT')
       OR has_table_privilege('authenticated', format('public.%I', v_table), 'UPDATE')
       OR has_table_privilege('authenticated', format('public.%I', v_table), 'DELETE') THEN
      RAISE EXCEPTION 'authenticated no debe escribir directamente en %.', v_table;
    END IF;
  END LOOP;
  IF has_table_privilege('authenticated', 'public.control_ejecuciones', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.control_ejecuciones', 'DELETE') THEN
    RAISE EXCEPTION 'Las ejecuciones de control deben ser inmutables.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.riesgo_mitigante
    WHERE activo = true AND eliminado_en IS NULL AND control_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Quedaron mitigantes activos sin migrar a controles.';
  END IF;
END;
$assert$;

COMMIT;
