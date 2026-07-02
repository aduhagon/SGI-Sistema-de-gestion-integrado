-- ============================================================================
-- 054: Flujo de auditoría en dos instancias (líder / operativo)
--
-- - Nuevas columnas de trazabilidad del flujo en auditorias
-- - Checklist de trabajo definido por el líder y completado por el operativo
-- - Adjuntos de documentación en hallazgos (contexto 'adjunto_hallazgo')
-- - Funciones de flujo: iniciar / emitir informe / devolver / aprobar cierre
-- - Enforcement por rol de equipo (líder vs auditor operativo)
-- - Tratamiento de hallazgos bloqueado hasta que el líder cierra la auditoría
-- - Responsable de proceso: ve la auditoría planificada (encabezado) y los
--   resultados recién cuando está cerrada
-- Requiere: 053_auditoria_flujo_enums (valores 'informe_emitido' y
-- 'adjunto_hallazgo').
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas
-- ----------------------------------------------------------------------------

ALTER TABLE auditorias
  ADD COLUMN IF NOT EXISTS informe_emitido_en  timestamptz,
  ADD COLUMN IF NOT EXISTS informe_emitido_por uuid REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS cerrada_por         uuid REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_devolucion   text;

COMMENT ON COLUMN auditorias.informe_emitido_en  IS 'Cuándo el auditor operativo emitió el informe de hallazgos.';
COMMENT ON COLUMN auditorias.informe_emitido_por IS 'Quién emitió el informe (auditor operativo).';
COMMENT ON COLUMN auditorias.cerrada_por         IS 'Auditor líder que aprobó el cierre definitivo.';
COMMENT ON COLUMN auditorias.motivo_devolucion   IS 'Último motivo de devolución del informe por el líder (NULL si no hubo o si se re-emitió).';

ALTER TABLE archivos
  ADD COLUMN IF NOT EXISTS hallazgo_id uuid REFERENCES hallazgos(id);

CREATE INDEX IF NOT EXISTS idx_archivos_hallazgo
  ON archivos (hallazgo_id) WHERE hallazgo_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Checklist de trabajo
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE checklist_resultado_enum AS ENUM ('pendiente','conforme','no_conforme','no_aplica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS auditoria_checklist_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id   uuid NOT NULL REFERENCES auditorias(id),
  orden          int  NOT NULL DEFAULT 1,
  descripcion    text NOT NULL,
  requisito_id   uuid REFERENCES requisitos(id),
  resultado      checklist_resultado_enum NOT NULL DEFAULT 'pendiente',
  comentario     text,
  hallazgo_id    uuid REFERENCES hallazgos(id),
  completado_en  timestamptz,
  completado_por uuid REFERENCES usuarios(id),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  creado_por     uuid REFERENCES usuarios(id),
  actualizado_en timestamptz,
  actualizado_por uuid REFERENCES usuarios(id),
  activo         boolean NOT NULL DEFAULT true,
  eliminado_en   timestamptz,
  eliminado_por  uuid REFERENCES usuarios(id),
  eliminado_motivo text
);

CREATE INDEX IF NOT EXISTS idx_checklist_auditoria
  ON auditoria_checklist_items (auditoria_id) WHERE activo = true;

DROP TRIGGER IF EXISTS trg_auditoria_checklist_actualizado ON auditoria_checklist_items;
CREATE TRIGGER trg_auditoria_checklist_actualizado
  BEFORE UPDATE ON auditoria_checklist_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

DROP TRIGGER IF EXISTS trg_auditoria_checklist_log ON auditoria_checklist_items;
CREATE TRIGGER trg_auditoria_checklist_log
  AFTER INSERT OR UPDATE OR DELETE ON auditoria_checklist_items
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_automatica();

ALTER TABLE auditoria_checklist_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Funciones helper de permisos
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_usuario_es_sgi_o_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM asignaciones_rol_global a
    JOIN roles_globales r ON r.id = a.rol_id
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE u.auth_user_id = auth.uid()
      AND r.codigo IN ('admin','responsable_sgi')
      AND r.activo = true AND u.activo = true
      AND a.vigente_hasta IS NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_es_sgi_o_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_es_sgi_o_admin() TO authenticated;

CREATE OR REPLACE FUNCTION fn_usuario_es_lider_auditoria(p_auditoria_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auditoria_equipo ae
    JOIN usuarios u ON u.id = ae.usuario_id
    WHERE ae.auditoria_id = p_auditoria_id
      AND ae.rol_auditoria = 'lider'
      AND ae.activo = true AND ae.eliminado_en IS NULL
      AND u.auth_user_id = auth.uid() AND u.activo = true
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_es_lider_auditoria(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_es_lider_auditoria(uuid) TO authenticated;

-- Miembro activo con rol operativo (líder o auditor; el observador no ejecuta).
CREATE OR REPLACE FUNCTION fn_usuario_es_miembro_equipo_auditoria(p_auditoria_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auditoria_equipo ae
    JOIN usuarios u ON u.id = ae.usuario_id
    WHERE ae.auditoria_id = p_auditoria_id
      AND ae.rol_auditoria IN ('lider','auditor')
      AND ae.activo = true AND ae.eliminado_en IS NULL
      AND u.auth_user_id = auth.uid() AND u.activo = true
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_es_miembro_equipo_auditoria(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_es_miembro_equipo_auditoria(uuid) TO authenticated;

-- Cualquier integrante activo del equipo (incluye observador): para visibilidad.
CREATE OR REPLACE FUNCTION fn_usuario_es_parte_equipo_auditoria(p_auditoria_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auditoria_equipo ae
    JOIN usuarios u ON u.id = ae.usuario_id
    WHERE ae.auditoria_id = p_auditoria_id
      AND ae.activo = true AND ae.eliminado_en IS NULL
      AND u.auth_user_id = auth.uid() AND u.activo = true
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_es_parte_equipo_auditoria(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_es_parte_equipo_auditoria(uuid) TO authenticated;

-- Usuario es responsable de alguno de los procesos del alcance de la auditoría.
-- SECURITY DEFINER a propósito: evita recursión de RLS entre auditorias y
-- auditoria_alcance (las políticas de cada tabla no pueden referirse entre sí).
CREATE OR REPLACE FUNCTION fn_usuario_es_responsable_proceso_alcance(p_auditoria_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auditoria_alcance aa
    JOIN puesto_proceso_rol ppr ON ppr.proceso_id = aa.proceso_id
         AND ppr.activo = true AND ppr.rol_en_proceso = 'responsable_proceso'
    JOIN persona_puesto pp ON pp.puesto_id = ppr.puesto_id AND pp.vigente_hasta IS NULL
    JOIN usuarios u ON u.persona_id = pp.persona_id AND u.activo = true
    WHERE aa.auditoria_id = p_auditoria_id
      AND aa.proceso_id IS NOT NULL
      AND aa.activo = true AND aa.eliminado_en IS NULL
      AND u.auth_user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION fn_usuario_es_responsable_proceso_alcance(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_usuario_es_responsable_proceso_alcance(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Trigger: transiciones de estado válidas e inmutabilidad al cierre
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_auditorias_validar_transicion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Cerrada o cancelada: inmutable (solo se permite el soft delete de admin/SGI).
  IF OLD.estado IN ('cerrada','cancelada') THEN
    IF NEW.eliminado_en IS DISTINCT FROM OLD.eliminado_en
       AND NEW.estado = OLD.estado THEN
      RETURN NEW; -- soft delete / restauración
    END IF;
    RAISE EXCEPTION 'La auditoría está % y no admite modificaciones.', OLD.estado;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT (
      (OLD.estado = 'planificada'     AND NEW.estado IN ('en_curso','cancelada')) OR
      (OLD.estado = 'en_curso'        AND NEW.estado IN ('informe_emitido','cancelada')) OR
      (OLD.estado = 'informe_emitido' AND NEW.estado IN ('cerrada','en_curso','cancelada'))
    ) THEN
      RAISE EXCEPTION 'Transición de estado inválida: % → %.', OLD.estado, NEW.estado;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_trg_auditorias_transiciones ON auditorias;
CREATE TRIGGER a_trg_auditorias_transiciones
  BEFORE UPDATE ON auditorias
  FOR EACH ROW EXECUTE FUNCTION fn_auditorias_validar_transicion();

-- ----------------------------------------------------------------------------
-- 5. Trigger: control del checklist según estado de la auditoría
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_checklist_control_por_estado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_estado auditoria_estado_enum;
BEGIN
  SELECT estado INTO v_estado FROM auditorias WHERE id = NEW.auditoria_id;

  IF TG_OP = 'INSERT' THEN
    IF v_estado <> 'planificada' THEN
      RAISE EXCEPTION 'El checklist se define durante la planificación (estado actual: %).', v_estado;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF v_estado = 'planificada' THEN
    -- Fase de definición: no se completa todavía.
    IF NEW.resultado IS DISTINCT FROM OLD.resultado
       OR NEW.comentario IS DISTINCT FROM OLD.comentario
       OR NEW.hallazgo_id IS DISTINCT FROM OLD.hallazgo_id THEN
      RAISE EXCEPTION 'El checklist se completa durante la ejecución de la auditoría.';
    END IF;
    RETURN NEW;

  ELSIF v_estado = 'en_curso' THEN
    -- Fase de ejecución: el plan es inmutable; solo se completa el resultado.
    IF NEW.descripcion IS DISTINCT FROM OLD.descripcion
       OR NEW.orden IS DISTINCT FROM OLD.orden
       OR NEW.requisito_id IS DISTINCT FROM OLD.requisito_id
       OR NEW.activo IS DISTINCT FROM OLD.activo
       OR NEW.eliminado_en IS DISTINCT FROM OLD.eliminado_en THEN
      RAISE EXCEPTION 'Con la auditoría en curso solo puede completarse el resultado de cada ítem.';
    END IF;
    IF NEW.resultado IS DISTINCT FROM OLD.resultado THEN
      IF NEW.resultado = 'pendiente' THEN
        NEW.completado_en := NULL;
        NEW.completado_por := NULL;
      ELSE
        NEW.completado_en := now();
        NEW.completado_por := fn_current_user_id();
      END IF;
    END IF;
    RETURN NEW;

  ELSE
    RAISE EXCEPTION 'El checklist no se modifica con la auditoría en estado %.', v_estado;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS a_trg_checklist_control ON auditoria_checklist_items;
CREATE TRIGGER a_trg_checklist_control
  BEFORE INSERT OR UPDATE ON auditoria_checklist_items
  FOR EACH ROW EXECUTE FUNCTION fn_checklist_control_por_estado();

-- ----------------------------------------------------------------------------
-- 6. Trigger: tratamiento de hallazgos bloqueado hasta el cierre aprobado
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_hallazgo_bloquear_tratamiento_previo_cierre()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_estado auditoria_estado_enum;
BEGIN
  IF NEW.responsable_tratamiento_id IS DISTINCT FROM OLD.responsable_tratamiento_id
     OR NEW.accion_tratamiento      IS DISTINCT FROM OLD.accion_tratamiento
     OR NEW.fecha_limite            IS DISTINCT FROM OLD.fecha_limite
     OR NEW.fecha_cierre_real       IS DISTINCT FROM OLD.fecha_cierre_real
     OR NEW.motivo_cierre           IS DISTINCT FROM OLD.motivo_cierre
     OR NEW.no_conformidad_id       IS DISTINCT FROM OLD.no_conformidad_id
     OR NEW.estado                  IS DISTINCT FROM OLD.estado THEN
    SELECT estado INTO v_estado FROM auditorias WHERE id = NEW.auditoria_id;
    IF v_estado <> 'cerrada' THEN
      RAISE EXCEPTION 'El tratamiento de hallazgos se habilita cuando el auditor líder aprueba y cierra la auditoría (estado actual: %).', v_estado;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_trg_hallazgos_bloquear_tratamiento ON hallazgos;
CREATE TRIGGER a_trg_hallazgos_bloquear_tratamiento
  BEFORE UPDATE ON hallazgos
  FOR EACH ROW EXECUTE FUNCTION fn_hallazgo_bloquear_tratamiento_previo_cierre();

-- ----------------------------------------------------------------------------
-- 7. Funciones de flujo
-- ----------------------------------------------------------------------------

-- 7.1 Iniciar la ejecución (planificada → en_curso)
CREATE OR REPLACE FUNCTION fn_iniciar_auditoria(p_auditoria_id uuid)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_usuario uuid;
  v_estado auditoria_estado_enum;
  v_tiene_lider boolean;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;

  SELECT estado INTO v_estado FROM auditorias
  WHERE id = p_auditoria_id AND eliminado_en IS NULL;
  IF v_estado IS NULL THEN
    RETURN QUERY SELECT false, 'Auditoría no encontrada.'; RETURN;
  END IF;
  IF v_estado <> 'planificada' THEN
    RETURN QUERY SELECT false, format('Solo se inicia una auditoría planificada (estado actual: %s).', v_estado); RETURN;
  END IF;

  IF NOT (fn_usuario_es_miembro_equipo_auditoria(p_auditoria_id) OR fn_usuario_es_sgi_o_admin()) THEN
    RETURN QUERY SELECT false, 'Solo el equipo auditor asignado puede iniciar la auditoría.'; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auditoria_equipo
    WHERE auditoria_id = p_auditoria_id AND rol_auditoria = 'lider'
      AND activo = true AND eliminado_en IS NULL
  ) INTO v_tiene_lider;
  IF NOT v_tiene_lider THEN
    RETURN QUERY SELECT false, 'Asigná un auditor líder al equipo antes de iniciar: es quien aprueba el cierre.'; RETURN;
  END IF;

  UPDATE auditorias
  SET estado = 'en_curso',
      fecha_inicio_real = COALESCE(fecha_inicio_real, now()),
      actualizado_por = v_usuario
  WHERE id = p_auditoria_id;

  RETURN QUERY SELECT true, 'Auditoría iniciada.';
END;
$$;
REVOKE EXECUTE ON FUNCTION fn_iniciar_auditoria(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_iniciar_auditoria(uuid) TO authenticated;

-- 7.2 Emitir el informe de hallazgos (en_curso → informe_emitido)
CREATE OR REPLACE FUNCTION fn_emitir_informe_auditoria(p_auditoria_id uuid)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_usuario uuid;
  v_aud record;
  v_pendientes int;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;

  SELECT id, codigo, titulo, estado INTO v_aud FROM auditorias
  WHERE id = p_auditoria_id AND eliminado_en IS NULL;
  IF v_aud.id IS NULL THEN
    RETURN QUERY SELECT false, 'Auditoría no encontrada.'; RETURN;
  END IF;
  IF v_aud.estado <> 'en_curso' THEN
    RETURN QUERY SELECT false, format('El informe se emite con la auditoría en curso (estado actual: %s).', v_aud.estado); RETURN;
  END IF;

  IF NOT (fn_usuario_es_miembro_equipo_auditoria(p_auditoria_id) OR fn_usuario_es_sgi_o_admin()) THEN
    RETURN QUERY SELECT false, 'Solo el equipo auditor asignado puede emitir el informe.'; RETURN;
  END IF;

  SELECT count(*) INTO v_pendientes
  FROM auditoria_checklist_items
  WHERE auditoria_id = p_auditoria_id
    AND activo = true AND eliminado_en IS NULL
    AND resultado = 'pendiente';
  IF v_pendientes > 0 THEN
    RETURN QUERY SELECT false, format('Hay %s ítem(s) del checklist sin completar. Completalos antes de emitir el informe.', v_pendientes); RETURN;
  END IF;

  UPDATE auditorias
  SET estado = 'informe_emitido',
      informe_emitido_en = now(),
      informe_emitido_por = v_usuario,
      motivo_devolucion = NULL,
      actualizado_por = v_usuario
  WHERE id = p_auditoria_id;

  -- Notificar a los líderes: informe listo para revisión.
  BEGIN
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_usuario_id, origen_sistema)
    SELECT ae.usuario_id, 'sistema', 'media',
           'Informe de auditoría listo para tu revisión',
           format('El equipo emitió el informe de hallazgos de %s — %s. Revisalo para aprobar el cierre o devolverlo.', v_aud.codigo, v_aud.titulo),
           'auditoria', p_auditoria_id, '/auditorias/' || p_auditoria_id, v_usuario, 'fn_emitir_informe_auditoria'
    FROM auditoria_equipo ae
    WHERE ae.auditoria_id = p_auditoria_id
      AND ae.rol_auditoria = 'lider'
      AND ae.activo = true AND ae.eliminado_en IS NULL
      AND ae.usuario_id IS NOT NULL
      AND ae.usuario_id <> v_usuario;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_emitir_informe_auditoria (notif): %', SQLERRM;
  END;

  RETURN QUERY SELECT true, 'Informe emitido. El auditor líder fue notificado para su revisión.';
END;
$$;
REVOKE EXECUTE ON FUNCTION fn_emitir_informe_auditoria(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_emitir_informe_auditoria(uuid) TO authenticated;

-- 7.3 Devolver el informe (informe_emitido → en_curso)
CREATE OR REPLACE FUNCTION fn_devolver_informe_auditoria(p_auditoria_id uuid, p_motivo text)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_usuario uuid;
  v_aud record;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RETURN QUERY SELECT false, 'Indicá el motivo de la devolución (mínimo 5 caracteres).'; RETURN;
  END IF;

  SELECT id, codigo, titulo, estado, informe_emitido_por INTO v_aud FROM auditorias
  WHERE id = p_auditoria_id AND eliminado_en IS NULL;
  IF v_aud.id IS NULL THEN
    RETURN QUERY SELECT false, 'Auditoría no encontrada.'; RETURN;
  END IF;
  IF v_aud.estado <> 'informe_emitido' THEN
    RETURN QUERY SELECT false, format('Solo se devuelve un informe emitido (estado actual: %s).', v_aud.estado); RETURN;
  END IF;

  IF NOT (fn_usuario_es_lider_auditoria(p_auditoria_id) OR fn_usuario_es_sgi_o_admin()) THEN
    RETURN QUERY SELECT false, 'Solo el auditor líder puede devolver el informe.'; RETURN;
  END IF;

  UPDATE auditorias
  SET estado = 'en_curso',
      motivo_devolucion = trim(p_motivo),
      actualizado_por = v_usuario
  WHERE id = p_auditoria_id;

  BEGIN
    IF v_aud.informe_emitido_por IS NOT NULL AND v_aud.informe_emitido_por <> v_usuario THEN
      INSERT INTO notificaciones
        (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_usuario_id, origen_sistema)
      VALUES (
        v_aud.informe_emitido_por, 'sistema', 'alta',
        'Informe de auditoría devuelto',
        format('El auditor líder devolvió el informe de %s — %s. Motivo: %s', v_aud.codigo, v_aud.titulo, trim(p_motivo)),
        'auditoria', p_auditoria_id, '/auditorias/' || p_auditoria_id, v_usuario, 'fn_devolver_informe_auditoria'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_devolver_informe_auditoria (notif): %', SQLERRM;
  END;

  RETURN QUERY SELECT true, 'Informe devuelto al equipo auditor con el motivo registrado.';
END;
$$;
REVOKE EXECUTE ON FUNCTION fn_devolver_informe_auditoria(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_devolver_informe_auditoria(uuid, text) TO authenticated;

-- 7.4 Aprobar el cierre definitivo (informe_emitido → cerrada)
CREATE OR REPLACE FUNCTION fn_aprobar_cierre_auditoria(p_auditoria_id uuid, p_conclusiones text)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_usuario uuid;
  v_aud record;
BEGIN
  v_usuario := fn_current_user_id();
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF p_conclusiones IS NULL OR length(trim(p_conclusiones)) < 5 THEN
    RETURN QUERY SELECT false, 'Las conclusiones son obligatorias para aprobar el cierre (mínimo 5 caracteres).'; RETURN;
  END IF;

  SELECT id, codigo, titulo, estado, informe_emitido_por INTO v_aud FROM auditorias
  WHERE id = p_auditoria_id AND eliminado_en IS NULL;
  IF v_aud.id IS NULL THEN
    RETURN QUERY SELECT false, 'Auditoría no encontrada.'; RETURN;
  END IF;
  IF v_aud.estado = 'cerrada' THEN
    RETURN QUERY SELECT false, 'La auditoría ya está cerrada.'; RETURN;
  END IF;
  IF v_aud.estado <> 'informe_emitido' THEN
    RETURN QUERY SELECT false, format('El cierre se aprueba con el informe emitido (estado actual: %s).', v_aud.estado); RETURN;
  END IF;

  IF NOT (fn_usuario_es_lider_auditoria(p_auditoria_id) OR fn_usuario_es_sgi_o_admin()) THEN
    RETURN QUERY SELECT false, 'Solo el auditor líder puede aprobar el cierre.'; RETURN;
  END IF;

  -- Segregación: quien emitió el informe no puede ser quien lo aprueba.
  IF v_aud.informe_emitido_por IS NOT NULL AND v_aud.informe_emitido_por = v_usuario THEN
    RETURN QUERY SELECT false, 'Quien emitió el informe no puede aprobar su propio cierre (segregación de funciones).'; RETURN;
  END IF;

  UPDATE auditorias
  SET estado = 'cerrada',
      conclusiones = trim(p_conclusiones),
      fecha_fin_real = now(),
      cerrada_por = v_usuario,
      actualizado_por = v_usuario
  WHERE id = p_auditoria_id;

  -- Notificar: responsables de los procesos del alcance (resultados disponibles)
  -- y equipo auditor.
  BEGIN
    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_usuario_id, origen_sistema)
    SELECT DISTINCT u.id, 'sistema', 'media',
           'Auditoría cerrada: resultados disponibles',
           format('Se cerró la auditoría %s — %s. Ya podés ver los hallazgos y conclusiones de tu proceso.', v_aud.codigo, v_aud.titulo),
           'auditoria', p_auditoria_id, '/auditorias/' || p_auditoria_id, v_usuario, 'fn_aprobar_cierre_auditoria'
    FROM auditoria_alcance aa
    JOIN puesto_proceso_rol ppr ON ppr.proceso_id = aa.proceso_id
         AND ppr.activo = true AND ppr.rol_en_proceso = 'responsable_proceso'
    JOIN persona_puesto pp ON pp.puesto_id = ppr.puesto_id AND pp.vigente_hasta IS NULL
    JOIN usuarios u ON u.persona_id = pp.persona_id AND u.activo = true
    WHERE aa.auditoria_id = p_auditoria_id
      AND aa.proceso_id IS NOT NULL
      AND aa.activo = true AND aa.eliminado_en IS NULL
      AND u.id <> v_usuario;

    INSERT INTO notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_usuario_id, origen_sistema)
    SELECT ae.usuario_id, 'sistema', 'media',
           'Cierre de auditoría aprobado',
           format('El auditor líder aprobó el cierre de %s — %s.', v_aud.codigo, v_aud.titulo),
           'auditoria', p_auditoria_id, '/auditorias/' || p_auditoria_id, v_usuario, 'fn_aprobar_cierre_auditoria'
    FROM auditoria_equipo ae
    WHERE ae.auditoria_id = p_auditoria_id
      AND ae.activo = true AND ae.eliminado_en IS NULL
      AND ae.usuario_id IS NOT NULL
      AND ae.usuario_id <> v_usuario;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_aprobar_cierre_auditoria (notif): %', SQLERRM;
  END;

  RETURN QUERY SELECT true, 'Cierre aprobado. La auditoría quedó cerrada y los resultados son visibles para los responsables de proceso.';
END;
$$;
REVOKE EXECUTE ON FUNCTION fn_aprobar_cierre_auditoria(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_aprobar_cierre_auditoria(uuid, text) TO authenticated;

-- La función de cierre en un solo paso queda reemplazada por el flujo nuevo.
DROP FUNCTION IF EXISTS fn_cerrar_auditoria(uuid, text);

-- ----------------------------------------------------------------------------
-- 8. Notificación de planificación a responsables de proceso
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_notificar_auditoria_planificada_proceso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_aud record;
BEGIN
  BEGIN
    IF NEW.proceso_id IS NOT NULL AND NEW.activo THEN
      SELECT codigo, titulo, fecha_planificada INTO v_aud
      FROM auditorias WHERE id = NEW.auditoria_id;

      INSERT INTO notificaciones
        (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_usuario_id, origen_sistema)
      SELECT DISTINCT u.id, 'auditoria_planificada', 'media',
             'Auditoría planificada sobre tu proceso',
             format('Tu proceso está en el alcance de %s — %s.%s Los resultados van a estar disponibles cuando el auditor líder cierre la auditoría.',
                    COALESCE(v_aud.codigo,'—'), COALESCE(v_aud.titulo,'—'),
                    CASE WHEN v_aud.fecha_planificada IS NOT NULL
                         THEN format(' Fecha planificada: %s.', to_char(v_aud.fecha_planificada, 'DD/MM/YYYY'))
                         ELSE '' END),
             'auditoria', NEW.auditoria_id, '/auditorias/' || NEW.auditoria_id, NEW.creado_por, 'trigger_automatico'
      FROM puesto_proceso_rol ppr
      JOIN persona_puesto pp ON pp.puesto_id = ppr.puesto_id AND pp.vigente_hasta IS NULL
      JOIN usuarios u ON u.persona_id = pp.persona_id AND u.activo = true
      WHERE ppr.proceso_id = NEW.proceso_id
        AND ppr.activo = true
        AND ppr.rol_en_proceso = 'responsable_proceso';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notificar_auditoria_planificada_proceso: % (alcance %)', SQLERRM, NEW.id;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_auditoria_planificada_proceso ON auditoria_alcance;
CREATE TRIGGER trg_notificar_auditoria_planificada_proceso
  AFTER INSERT ON auditoria_alcance
  FOR EACH ROW EXECUTE FUNCTION fn_notificar_auditoria_planificada_proceso();

-- ----------------------------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------------------------

-- 9.1 auditorias: el responsable de proceso del alcance ve el encabezado
-- Solo funciones SECURITY DEFINER: las políticas de auditorias no pueden
-- referenciar auditoria_equipo ni auditoria_alcance en forma directa porque
-- las políticas de esas tablas referencian auditorias (recursión de RLS).
DROP POLICY IF EXISTS auditorias_select ON auditorias;
CREATE POLICY auditorias_select ON auditorias FOR SELECT
USING (
  activo = true AND (
    (SELECT fn_usuario_es_auditor_o_sgi())
    OR (SELECT fn_usuario_es_parte_equipo_auditoria(id))
    OR (SELECT fn_usuario_es_responsable_proceso_alcance(id))
  )
);

-- 9.2 auditorias: editar = SGI/admin o líder de ESA auditoría
DROP POLICY IF EXISTS auditorias_update_auditor ON auditorias;
DROP POLICY IF EXISTS auditorias_update ON auditorias;
CREATE POLICY auditorias_update ON auditorias FOR UPDATE
USING (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (SELECT fn_usuario_es_lider_auditoria(id))
)
WITH CHECK (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (SELECT fn_usuario_es_lider_auditoria(id))
);

-- 9.3 auditoria_equipo
DROP POLICY IF EXISTS auditoria_equipo_select ON auditoria_equipo;
CREATE POLICY auditoria_equipo_select ON auditoria_equipo FOR SELECT
USING (
  activo = true AND EXISTS (
    SELECT 1 FROM auditorias a WHERE a.id = auditoria_equipo.auditoria_id
  )
);

DROP POLICY IF EXISTS auditoria_equipo_insert ON auditoria_equipo;
CREATE POLICY auditoria_equipo_insert ON auditoria_equipo FOR INSERT
WITH CHECK (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (
    (SELECT fn_usuario_es_lider_auditoria(auditoria_id))
    AND EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = auditoria_equipo.auditoria_id
        AND a.estado IN ('planificada','en_curso')
    )
  )
  -- Bootstrap: quien creó la auditoría arma el equipo mientras está planificada.
  OR EXISTS (
    SELECT 1 FROM auditorias a
    WHERE a.id = auditoria_equipo.auditoria_id
      AND a.creado_por = (SELECT fn_usuario_id_actual())
      AND a.estado = 'planificada'
  )
);

DROP POLICY IF EXISTS auditoria_equipo_update ON auditoria_equipo;
CREATE POLICY auditoria_equipo_update ON auditoria_equipo FOR UPDATE
USING (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (SELECT fn_usuario_es_lider_auditoria(auditoria_id))
  OR EXISTS (
    SELECT 1 FROM auditorias a
    WHERE a.id = auditoria_equipo.auditoria_id
      AND a.creado_por = (SELECT fn_usuario_id_actual())
      AND a.estado = 'planificada'
  )
)
WITH CHECK (true);

-- 9.4 hallazgos
DROP POLICY IF EXISTS hallazgos_select ON hallazgos;
CREATE POLICY hallazgos_select ON hallazgos FOR SELECT
USING (
  activo = true AND (
    (SELECT fn_usuario_es_auditor_o_sgi())
    OR (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
    OR detectado_por_usuario_id = (SELECT fn_usuario_id_actual())
    OR responsable_tratamiento_id = (SELECT fn_usuario_id_actual())
    -- El responsable de proceso ve los hallazgos recién con la auditoría cerrada.
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

DROP POLICY IF EXISTS hallazgos_insert ON hallazgos;
CREATE POLICY hallazgos_insert ON hallazgos FOR INSERT
WITH CHECK (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (
    (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
    AND EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = hallazgos.auditoria_id AND a.estado = 'en_curso'
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
  OR (estado = 'en_tratamiento' AND responsable_tratamiento_id = (SELECT fn_usuario_id_actual()))
  OR (
    -- Tratamiento post-cierre: auditores globales gestionan hallazgos cerrados/abiertos.
    (SELECT fn_usuario_es_auditor_o_sgi())
    AND EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = hallazgos.auditoria_id AND a.estado = 'cerrada'
    )
  )
)
WITH CHECK (true);

-- 9.5 archivos: adjuntos de hallazgos
DROP POLICY IF EXISTS archivos_insert ON archivos;
CREATE POLICY archivos_insert ON archivos FOR INSERT
WITH CHECK (
  (contexto = ANY (ARRAY['documento'::archivo_contexto_enum, 'evidencia_nc'::archivo_contexto_enum]))
  OR (
    contexto = 'adjunto_nc'::archivo_contexto_enum
    AND EXISTS (
      SELECT 1 FROM no_conformidades nc
      WHERE nc.id = archivos.no_conformidad_id
        AND nc.creado_por = fn_usuario_id_actual()
    )
  )
  OR (
    contexto = 'adjunto_hallazgo'::archivo_contexto_enum
    AND EXISTS (
      SELECT 1 FROM hallazgos h
      JOIN auditorias a ON a.id = h.auditoria_id
      WHERE h.id = archivos.hallazgo_id
        AND a.estado = 'en_curso'
        AND (
          (SELECT fn_usuario_es_miembro_equipo_auditoria(a.id))
          OR (SELECT fn_usuario_es_sgi_o_admin())
        )
    )
  )
);

DROP POLICY IF EXISTS archivos_select ON archivos;
CREATE POLICY archivos_select ON archivos FOR SELECT
USING (
  activo = true AND (
    (
      contexto = 'documento'::archivo_contexto_enum
      AND EXISTS (
        SELECT 1 FROM versiones v
        WHERE v.id = archivos.version_id
          AND fn_documento_es_visible_para_usuario(v.documento_id)
      )
    )
    OR (
      contexto = ANY (ARRAY['evidencia_nc'::archivo_contexto_enum, 'adjunto_nc'::archivo_contexto_enum])
      AND EXISTS (SELECT 1 FROM no_conformidades nc WHERE nc.id = archivos.no_conformidad_id)
    )
    OR (
      contexto = 'adjunto_hallazgo'::archivo_contexto_enum
      AND EXISTS (SELECT 1 FROM hallazgos h WHERE h.id = archivos.hallazgo_id)
    )
  )
);

-- 9.6 auditoria_checklist_items
DROP POLICY IF EXISTS checklist_select ON auditoria_checklist_items;
CREATE POLICY checklist_select ON auditoria_checklist_items FOR SELECT
USING (
  activo = true AND (
    (SELECT fn_usuario_es_auditor_o_sgi())
    OR (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
    OR EXISTS (
      SELECT 1
      FROM auditorias a
      JOIN auditoria_alcance aa ON aa.auditoria_id = a.id
        AND aa.proceso_id IS NOT NULL AND aa.activo = true AND aa.eliminado_en IS NULL
      WHERE a.id = auditoria_checklist_items.auditoria_id
        AND a.estado = 'cerrada'
        AND fn_usuario_participa_en_proceso(aa.proceso_id, 'responsable_proceso'::rol_proceso_enum)
    )
  )
);

DROP POLICY IF EXISTS checklist_insert ON auditoria_checklist_items;
CREATE POLICY checklist_insert ON auditoria_checklist_items FOR INSERT
WITH CHECK (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (SELECT fn_usuario_es_lider_auditoria(auditoria_id))
);

DROP POLICY IF EXISTS checklist_update ON auditoria_checklist_items;
CREATE POLICY checklist_update ON auditoria_checklist_items FOR UPDATE
USING (
  (SELECT fn_usuario_es_sgi_o_admin())
  OR (SELECT fn_usuario_es_lider_auditoria(auditoria_id))
  OR (SELECT fn_usuario_es_miembro_equipo_auditoria(auditoria_id))
)
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 10. Storage: bucket para documentación de hallazgos
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-auditoria', 'evidencias-auditoria', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY evidencias_aud_insert_authenticated ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidencias-auditoria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY evidencias_aud_select_authenticated ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'evidencias-auditoria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY evidencias_aud_delete_authenticated ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'evidencias-auditoria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
