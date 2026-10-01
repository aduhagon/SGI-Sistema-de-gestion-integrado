-- Panel operativo del correo para superadministracion y recuperacion segura
-- del resumen de la semana actual.

create or replace function public.fn_correo_panel_salud()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $function$
declare
  v_zona text := 'America/Argentina/Buenos_Aires';
  v_inicio_semana timestamptz;
  v_habilitado boolean := false;
  v_job jsonb;
  v_semana jsonb;
  v_cola jsonb;
  v_fallos jsonb;
begin
  if not coalesce(public.fn_es_superadmin(), false) then
    raise exception 'Solo el superadministrador puede consultar la salud del correo.';
  end if;

  select coalesce(valor #>> '{}', v_zona)
    into v_zona
  from public.configuracion_sistema
  where clave = 'zona_horaria';

  select coalesce((valor #>> '{}')::boolean, false)
    into v_habilitado
  from public.configuracion_sistema
  where clave = 'correo_envio_habilitado';

  v_inicio_semana := date_trunc('week', now() at time zone v_zona) at time zone v_zona;

  select jsonb_build_object(
    'activo', j.active,
    'programacion', j.schedule,
    'ultimaEjecucion', d.start_time,
    'ultimaFinalizacion', d.end_time,
    'ultimoEstado', d.status,
    'ultimoMensaje', left(d.return_message, 500)
  )
  into v_job
  from cron.job j
  left join lateral (
    select r.start_time, r.end_time, r.status, r.return_message
    from cron.job_run_details r
    where r.jobid = j.jobid
    order by r.start_time desc
    limit 1
  ) d on true
  where j.jobname = 'sgi-resumen-semanal';

  select jsonb_build_object(
    'total', count(*)::int,
    'enviados', count(*) filter (where estado = 'enviado')::int,
    'pendientes', count(*) filter (where estado = 'pendiente')::int,
    'fallidos', count(*) filter (where estado = 'fallido')::int,
    'agotados', count(*) filter (where estado = 'agotado')::int,
    'ultimoEnvio', max(enviado_en)
  )
  into v_semana
  from public.envios_correo
  where origen = 'resumen_semanal'
    and creado_en >= v_inicio_semana;

  select jsonb_build_object(
    'pendientes', count(*) filter (where estado = 'pendiente')::int,
    'fallidos', count(*) filter (where estado = 'fallido')::int,
    'agotados', count(*) filter (where estado = 'agotado')::int
  )
  into v_cola
  from public.envios_correo;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'destinatario', f.destinatario,
    'estado', f.estado,
    'intentos', f.intentos,
    'error', left(f.ultimo_error, 300),
    'creadoEn', f.creado_en
  ) order by f.creado_en desc), '[]'::jsonb)
  into v_fallos
  from (
    select id, destinatario, estado, intentos, ultimo_error, creado_en
    from public.envios_correo
    where estado in ('fallido', 'agotado')
    order by creado_en desc
    limit 5
  ) f;

  return jsonb_build_object(
    'habilitado', v_habilitado,
    'zonaHoraria', v_zona,
    'consultadoEn', now(),
    'job', coalesce(v_job, '{}'::jsonb),
    'semana', coalesce(v_semana, '{}'::jsonb),
    'cola', coalesce(v_cola, '{}'::jsonb),
    'fallosRecientes', v_fallos
  );
end;
$function$;

create or replace function public.fn_correo_reintentar_resumen_semana()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_zona text := 'America/Argentina/Buenos_Aires';
  v_inicio_semana timestamptz;
  v_reactivados integer := 0;
  v_reintentados integer := 0;
  v_agotados integer := 0;
begin
  if not coalesce(public.fn_es_superadmin(), false) then
    raise exception 'Solo el superadministrador puede reintentar correos.';
  end if;

  if not pg_try_advisory_xact_lock(hashtextextended('sgi-correo-recuperacion', 0)) then
    raise exception 'Ya hay una recuperacion de correo en curso.';
  end if;

  select coalesce(valor #>> '{}', v_zona)
    into v_zona
  from public.configuracion_sistema
  where clave = 'zona_horaria';

  v_inicio_semana := date_trunc('week', now() at time zone v_zona) at time zone v_zona;

  update public.envios_correo
  set estado = 'fallido',
      intentos = 0,
      request_id = null,
      status_code = null,
      proximo_intento_en = now()
  where origen = 'resumen_semanal'
    and creado_en >= v_inicio_semana
    and estado in ('fallido', 'agotado');

  get diagnostics v_reactivados = row_count;

  if v_reactivados > 0 then
    select r.reintentados, r.agotados
      into v_reintentados, v_agotados
    from public.fn_correo_reintentar() r;
  end if;

  return jsonb_build_object(
    'reactivados', v_reactivados,
    'reintentados', v_reintentados,
    'agotados', v_agotados
  );
end;
$function$;

revoke all on function public.fn_correo_panel_salud()
  from public, anon;
revoke all on function public.fn_correo_reintentar_resumen_semana()
  from public, anon;

grant execute on function public.fn_correo_panel_salud()
  to authenticated, service_role;
grant execute on function public.fn_correo_reintentar_resumen_semana()
  to authenticated, service_role;
