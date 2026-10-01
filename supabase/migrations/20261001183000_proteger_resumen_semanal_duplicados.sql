-- Evita ejecuciones simultaneas y correos semanales duplicados.
-- Una reejecucion completa la semana solo para usuarios que aun no tengan
-- un envio registrado. Los envios fallidos se recuperan mediante la cola de
-- reintentos existente, sin generar una segunda copia.

create index if not exists idx_envios_correo_resumen_usuario_semana
  on public.envios_correo (usuario_id, creado_en desc)
  where origen = 'resumen_semanal';

do $migration$
declare
  v_oid oid;
  v_def text;
  v_new text;
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_enviar_resumen_semanal'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1;

  if v_oid is null then
    raise exception 'No se encontro public.fn_enviar_resumen_semanal()';
  end if;

  v_def := pg_get_functiondef(v_oid);

  v_new := replace(
    v_def,
    E'BEGIN\n  SELECT habilitado INTO v_modulo_on',
    E'BEGIN\n  -- Una sola ejecucion del resumen puede generar envios a la vez.\n  IF NOT pg_try_advisory_xact_lock(hashtextextended(''sgi-resumen-semanal'', 0)) THEN\n    RETURN QUERY SELECT 0, 0; RETURN;\n  END IF;\n\n  SELECT habilitado INTO v_modulo_on'
  );

  if v_new = v_def then
    raise exception 'No se encontro el inicio esperado de fn_enviar_resumen_semanal';
  end if;

  v_def := v_new;
  v_new := replace(
    v_def,
    E'  LOOP\n    SELECT\n      count(*)::int,',
    E'  LOOP\n    -- No duplicar el resumen del mismo usuario dentro de la semana local.\n    IF EXISTS (\n      SELECT 1\n      FROM public.envios_correo e\n      WHERE e.origen = ''resumen_semanal''\n        AND e.usuario_id = r_user.id\n        AND e.creado_en >= (\n          date_trunc(''week'', now() AT TIME ZONE v_zona) AT TIME ZONE v_zona\n        )\n    ) THEN\n      CONTINUE;\n    END IF;\n\n    SELECT\n      count(*)::int,'
  );

  if v_new = v_def then
    raise exception 'No se encontro el bucle esperado de fn_enviar_resumen_semanal';
  end if;

  execute v_new;
end;
$migration$;
