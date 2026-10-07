-- Centro de pendientes: validacion RBAC por usuario autenticado.
-- Ejecutar como administrador de base de datos. El test simula identidades
-- authenticated y no modifica datos productivos.
DO $test$
DECLARE
  caso record;
  gestor uuid;
  auth_gestor uuid;
  verificador uuid;
  auth_verificador uuid;
  responsable uuid;
  auth_responsable uuid;
  requisito_asignado uuid;
  ajeno uuid;
  auth_ajeno uuid;
  otro_usuario uuid;
  roles_probados integer := 0;
  rol_original text := current_user;
BEGIN
  SELECT u.id, u.auth_user_id INTO gestor, auth_gestor
  FROM public.usuarios u
  WHERE u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.asignaciones_rol_global a
      JOIN public.roles_globales r ON r.id = a.rol_id
      WHERE a.usuario_id = u.id
        AND a.vigente_hasta IS NULL
        AND r.codigo IN ('admin', 'responsable_sgi', 'superadmin')
        AND r.activo
    )
  ORDER BY u.id
  LIMIT 1;

  IF gestor IS NULL THEN
    RAISE EXCEPTION 'No hay usuario gestor SGI activo para validar el centro de pendientes.';
  END IF;

  SELECT u.id, u.auth_user_id INTO verificador, auth_verificador
  FROM public.usuarios u
  WHERE u.id <> gestor
    AND u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.asignaciones_rol_global a
      JOIN public.roles_globales r ON r.id = a.rol_id
      WHERE a.usuario_id = u.id
        AND a.vigente_hasta IS NULL
        AND r.codigo IN ('admin', 'responsable_sgi', 'superadmin')
        AND r.activo
    )
  ORDER BY u.id
  LIMIT 1;

  -- Usa una asignacion legal existente; no crea ni modifica fixtures.
  SELECT r.id, u.id, u.auth_user_id
    INTO requisito_asignado, responsable, auth_responsable
  FROM public.requisitos_legales r
  JOIN public.puestos p ON p.id = r.responsable_evaluacion_puesto_id
  JOIN public.persona_puesto pp ON pp.puesto_id = p.id
  JOIN public.usuarios u ON u.persona_id = pp.persona_id
  JOIN public.personas pe ON pe.id = pp.persona_id
  WHERE r.eliminado_en IS NULL
    AND p.activo AND p.eliminado_en IS NULL
    AND pp.vigente_desde <= now()
    AND (pp.vigente_hasta IS NULL OR pp.vigente_hasta > now())
    AND u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL
    AND pe.activo AND pe.eliminado_en IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.asignaciones_rol_global a
      JOIN public.roles_globales rg ON rg.id = a.rol_id
      WHERE a.usuario_id = u.id
        AND a.vigente_hasta IS NULL
        AND rg.codigo IN ('admin', 'responsable_sgi', 'superadmin', 'auditor', 'responsable_proceso_general')
        AND rg.activo
    )
  ORDER BY r.id, u.id
  LIMIT 1;

  SELECT u.id, u.auth_user_id INTO ajeno, auth_ajeno
  FROM public.usuarios u
  WHERE u.activo AND u.eliminado_en IS NULL AND u.auth_user_id IS NOT NULL
    AND u.id IS DISTINCT FROM gestor
    AND u.id IS DISTINCT FROM verificador
    AND u.id IS DISTINCT FROM responsable
    AND NOT EXISTS (
      SELECT 1
      FROM public.asignaciones_rol_global a
      JOIN public.roles_globales r ON r.id = a.rol_id
      WHERE a.usuario_id = u.id
        AND a.vigente_hasta IS NULL
        AND r.codigo IN ('admin', 'responsable_sgi', 'superadmin', 'auditor', 'responsable_proceso_general')
        AND r.activo
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.persona_puesto pp
      WHERE pp.persona_id = u.persona_id
        AND pp.vigente_desde <= now()
        AND (pp.vigente_hasta IS NULL OR pp.vigente_hasta > now())
    )
  ORDER BY u.id
  LIMIT 1;

  SET LOCAL ROLE authenticated;

  FOR caso IN
    SELECT 'gestor'::text AS nombre, gestor AS usuario_id, auth_gestor AS auth_id
    UNION ALL SELECT 'verificador', verificador, auth_verificador WHERE verificador IS NOT NULL
    UNION ALL SELECT 'responsable_legal', responsable, auth_responsable WHERE responsable IS NOT NULL
    UNION ALL SELECT 'ajeno', ajeno, auth_ajeno WHERE ajeno IS NOT NULL
  LOOP
    roles_probados := roles_probados + 1;

    PERFORM set_config('request.jwt.claim.sub', caso.auth_id::text, true);
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', caso.auth_id, 'role', 'authenticated')::text,
      true
    );

    -- La bandeja personal solo puede consultarse para el usuario autenticado.
    PERFORM public.fn_pendientes_usuario(caso.usuario_id);

    SELECT x.usuario_id INTO otro_usuario
    FROM (
      SELECT gestor AS usuario_id
      UNION SELECT verificador WHERE verificador IS NOT NULL
      UNION SELECT responsable WHERE responsable IS NOT NULL
      UNION SELECT ajeno WHERE ajeno IS NOT NULL
    ) x
    WHERE x.usuario_id IS DISTINCT FROM caso.usuario_id
    LIMIT 1;

    IF otro_usuario IS NOT NULL THEN
      BEGIN
        PERFORM public.fn_pendientes_usuario(otro_usuario);
        RAISE EXCEPTION USING ERRCODE = 'ZX002', MESSAGE = 'Se consultaron pendientes de otro usuario.';
      EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%pendientes propios%' THEN RAISE; END IF;
      END;
    END IF;

    -- Los pendientes de mejora deben coincidir con el rol operativo del usuario.
    IF EXISTS (
      SELECT 1
      FROM public.fn_pendientes_mejora() p
      JOIN public.no_conformidades n ON n.id = p.entidad_id
      WHERE p.modulo = 'tratamiento'
        AND NOT (
          n.responsable_tratamiento_id = public.fn_usuario_id_actual()
          OR (n.responsable_tratamiento_id IS NULL AND (public.fn_usuario_es_auditor_o_sgi() OR public.fn_usuario_es_admin()))
        )
    ) THEN
      RAISE EXCEPTION 'Tratamiento visible sin responsabilidad para %.', caso.nombre;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.fn_pendientes_mejora() p
      JOIN public.no_conformidades n ON n.id = p.entidad_id
      WHERE p.modulo = 'verificaciones'
        AND n.verificador_eficacia_id IS DISTINCT FROM public.fn_usuario_id_actual()
    ) THEN
      RAISE EXCEPTION 'Verificacion visible para usuario no verificador: %.', caso.nombre;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.fn_pendientes_mejora() p
      JOIN public.no_conformidades n ON n.id = p.entidad_id
      WHERE p.modulo = 'cierres'
        AND n.responsable_tratamiento_id IS DISTINCT FROM public.fn_usuario_id_actual()
    ) THEN
      RAISE EXCEPTION 'Cierre visible para usuario no responsable: %.', caso.nombre;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.fn_pendientes_mejora() p
      JOIN public.no_conformidades n ON n.id = p.entidad_id
      WHERE p.modulo = 'documentacion'
        AND NOT (
          n.responsable_tratamiento_id = public.fn_usuario_id_actual()
          OR EXISTS (
            SELECT 1
            FROM public.acciones a
            WHERE a.no_conformidad_id = n.id
              AND a.activo AND a.eliminado_en IS NULL
              AND a.requiere_cambio_documental
              AND a.estado <> 'cancelada'
              AND a.responsable_id = public.fn_usuario_id_actual()
          )
        )
    ) THEN
      RAISE EXCEPTION 'Pendiente documental visible sin responsabilidad para %.', caso.nombre;
    END IF;
  END LOOP;

  IF roles_probados < 2 THEN
    RAISE EXCEPTION 'No hay suficientes identidades activas para validar RBAC de pendientes.';
  END IF;

  IF responsable IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', auth_responsable::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', auth_responsable, 'role', 'authenticated')::text, true);
    IF (public.fn_contexto_responsables_legales()->>'gestion')::boolean THEN
      RAISE EXCEPTION 'Un responsable operativo no debe ver gestion general legal.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(public.fn_contexto_responsables_legales()->'requisitos') AS x(id uuid, "esResponsable" boolean)
      WHERE x.id = requisito_asignado AND x."esResponsable"
    ) THEN
      RAISE EXCEPTION 'El responsable del puesto no ve su requisito legal asignado.';
    END IF;
  ELSE
    RAISE NOTICE 'Sin requisito legal asignado a un puesto operativo no administrador; se omite ese subcaso.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', auth_gestor::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', auth_gestor, 'role', 'authenticated')::text, true);
  IF NOT (public.fn_contexto_responsables_legales()->>'gestion')::boolean THEN
    RAISE EXCEPTION 'El gestor SGI no ve gestion general legal.';
  END IF;

  EXECUTE format('SET LOCAL ROLE %I', rol_original);
  RAISE NOTICE 'CENTRO PENDIENTES RBAC OK: pendientes propios, mejora y responsables legales validados sin modificar datos.';
END;
$test$;
