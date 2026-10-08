CREATE TABLE IF NOT EXISTS public.seguimiento_pendientes_gerencial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  entidad_id uuid NOT NULL,
  responsable_clave text NOT NULL,
  responsable_nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'sin_revisar',
  nota text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid REFERENCES public.usuarios(id),
  CONSTRAINT seguimiento_pendientes_gerencial_estado_chk
    CHECK (estado IN ('sin_revisar', 'en_curso', 'bloqueado', 'contactado')),
  CONSTRAINT seguimiento_pendientes_gerencial_unq
    UNIQUE (modulo, entidad_id, responsable_clave)
);

ALTER TABLE public.seguimiento_pendientes_gerencial ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.seguimiento_pendientes_gerencial FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.seguimiento_pendientes_gerencial TO service_role;

CREATE OR REPLACE FUNCTION public.fn_seguimientos_pendientes_gerencial()
RETURNS TABLE(
  modulo text,
  entidad_id uuid,
  responsable_clave text,
  responsable_nombre text,
  estado text,
  nota text,
  actualizado_en timestamptz,
  actualizado_por uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.fn_usuario_id_actual() IS NULL THEN
    RAISE EXCEPTION 'Sesion no valida.';
  END IF;

  IF NOT private.fn_usuario_es_gestor_sgi() THEN
    RAISE EXCEPTION 'Solo un administrador o responsable del SGI puede consultar el seguimiento gerencial.';
  END IF;

  RETURN QUERY
  SELECT
    s.modulo,
    s.entidad_id,
    s.responsable_clave,
    s.responsable_nombre,
    s.estado,
    s.nota,
    s.actualizado_en,
    s.actualizado_por
  FROM public.seguimiento_pendientes_gerencial s
  ORDER BY s.actualizado_en DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_guardar_seguimiento_pendiente_gerencial(
  p_modulo text,
  p_entidad_id uuid,
  p_responsable_clave text,
  p_responsable_nombre text,
  p_estado text,
  p_nota text DEFAULT NULL
)
RETURNS TABLE(
  modulo text,
  entidad_id uuid,
  responsable_clave text,
  responsable_nombre text,
  estado text,
  nota text,
  actualizado_en timestamptz,
  actualizado_por uuid
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid := public.fn_usuario_id_actual();
  v_estado text := nullif(btrim(coalesce(p_estado, '')), '');
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Sesion no valida.';
  END IF;

  IF NOT private.fn_usuario_es_gestor_sgi() THEN
    RAISE EXCEPTION 'Solo un administrador o responsable del SGI puede actualizar el seguimiento gerencial.';
  END IF;

  IF p_modulo IS NULL OR btrim(p_modulo) = '' THEN
    RAISE EXCEPTION 'El modulo es obligatorio.';
  END IF;

  IF p_entidad_id IS NULL THEN
    RAISE EXCEPTION 'La entidad es obligatoria.';
  END IF;

  IF p_responsable_clave IS NULL OR btrim(p_responsable_clave) = '' THEN
    RAISE EXCEPTION 'El responsable es obligatorio.';
  END IF;

  IF v_estado NOT IN ('sin_revisar', 'en_curso', 'bloqueado', 'contactado') THEN
    RAISE EXCEPTION 'Estado de seguimiento invalido.';
  END IF;

  RETURN QUERY
  INSERT INTO public.seguimiento_pendientes_gerencial (
    modulo,
    entidad_id,
    responsable_clave,
    responsable_nombre,
    estado,
    nota,
    actualizado_por
  )
  VALUES (
    btrim(p_modulo),
    p_entidad_id,
    btrim(p_responsable_clave),
    coalesce(nullif(btrim(p_responsable_nombre), ''), 'Sin responsable'),
    v_estado,
    v_nota,
    v_usuario_id
  )
  ON CONFLICT (modulo, entidad_id, responsable_clave)
  DO UPDATE SET
    responsable_nombre = EXCLUDED.responsable_nombre,
    estado = EXCLUDED.estado,
    nota = EXCLUDED.nota,
    actualizado_por = EXCLUDED.actualizado_por,
    actualizado_en = now()
  RETURNING
    seguimiento_pendientes_gerencial.modulo,
    seguimiento_pendientes_gerencial.entidad_id,
    seguimiento_pendientes_gerencial.responsable_clave,
    seguimiento_pendientes_gerencial.responsable_nombre,
    seguimiento_pendientes_gerencial.estado,
    seguimiento_pendientes_gerencial.nota,
    seguimiento_pendientes_gerencial.actualizado_en,
    seguimiento_pendientes_gerencial.actualizado_por;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_seguimientos_pendientes_gerencial() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guardar_seguimiento_pendiente_gerencial(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_seguimientos_pendientes_gerencial() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_guardar_seguimiento_pendiente_gerencial(text, uuid, text, text, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
