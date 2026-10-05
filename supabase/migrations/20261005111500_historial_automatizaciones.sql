-- Estado actual e historial corto de automatizaciones para Superadministracion.

create or replace function public.fn_sistema_automatizaciones_salud()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $function$
declare
  v_resultado jsonb;
begin
  if not coalesce(public.fn_es_superadmin(), false) then
    raise exception 'Solo el superadministrador puede consultar automatizaciones.';
  end if;

  select jsonb_build_object(
    'total', count(*)::int,
    'activas', count(*) filter (where j.active)::int,
    'jobsConFallaActual', count(*) filter (
      where j.active and u.ultimo_estado is not null
        and u.ultimo_estado not in ('succeeded', 'running')
    )::int,
    'sinEjecuciones', count(*) filter (where j.active and u.ultimo_estado is null)::int,
    'fallosSieteDias', coalesce(sum(coalesce(h.fallos_siete_dias, 0)), 0)::int,
    'recuperadas', count(*) filter (
      where j.active and u.ultimo_estado = 'succeeded'
        and h.ultimo_fallo is not null
        and h.ultimo_exito > h.ultimo_fallo
        and h.ultimo_fallo >= now() - interval '7 days'
    )::int,
    'jobs', coalesce(jsonb_agg(jsonb_build_object(
      'nombre', coalesce(j.jobname, 'Tarea ' || j.jobid::text),
      'programacion', j.schedule,
      'activa', j.active,
      'estadoActual', case
        when not j.active then 'inactiva'
        when u.ultimo_estado is null then 'sin_ejecuciones'
        when u.ultimo_estado = 'running' then 'en_curso'
        when u.ultimo_estado <> 'succeeded' then 'fallando'
        when h.ultimo_fallo is not null and h.ultimo_exito > h.ultimo_fallo
          and h.ultimo_fallo >= now() - interval '7 days' then 'recuperada'
        else 'operativa'
      end,
      'ultimoEstado', u.ultimo_estado,
      'ultimaEjecucion', u.ultima_ejecucion,
      'ultimaFinalizacion', u.ultima_finalizacion,
      'ultimoMensaje', left(u.ultimo_mensaje, 300),
      'ultimoExito', h.ultimo_exito,
      'ultimoFallo', h.ultimo_fallo,
      'duracionSegundos', u.duracion_segundos,
      'fallosSieteDias', coalesce(h.fallos_siete_dias, 0),
      'historial', coalesce(hist.items, '[]'::jsonb)
    ) order by coalesce(j.jobname, j.jobid::text)), '[]'::jsonb)
  )
  into v_resultado
  from cron.job j
  left join lateral (
    select r.status as ultimo_estado,
           r.start_time as ultima_ejecucion,
           r.end_time as ultima_finalizacion,
           r.return_message as ultimo_mensaje,
           case when r.end_time is not null
             then round(extract(epoch from (r.end_time - r.start_time))::numeric, 3)
             else null end as duracion_segundos
    from cron.job_run_details r
    where r.jobid = j.jobid
    order by r.start_time desc
    limit 1
  ) u on true
  left join lateral (
    select
      max(r.start_time) filter (where r.status = 'succeeded') as ultimo_exito,
      max(r.start_time) filter (where r.status not in ('succeeded', 'running')) as ultimo_fallo,
      count(*) filter (
        where r.start_time >= now() - interval '7 days'
          and r.status not in ('succeeded', 'running')
      )::int as fallos_siete_dias
    from cron.job_run_details r
    where r.jobid = j.jobid
  ) h on true
  left join lateral (
    select jsonb_agg(x.item order by x.inicio desc) as items
    from (
      select r.start_time as inicio, jsonb_build_object(
        'estado', r.status,
        'inicio', r.start_time,
        'fin', r.end_time,
        'duracionSegundos', case when r.end_time is not null
          then round(extract(epoch from (r.end_time - r.start_time))::numeric, 3)
          else null end,
        'mensaje', left(r.return_message, 200)
      ) as item
      from cron.job_run_details r
      where r.jobid = j.jobid
      order by r.start_time desc
      limit 5
    ) x
  ) hist on true;

  return coalesce(v_resultado, jsonb_build_object(
    'total', 0, 'activas', 0, 'jobsConFallaActual', 0,
    'sinEjecuciones', 0, 'fallosSieteDias', 0, 'recuperadas', 0,
    'jobs', '[]'::jsonb
  ));
end;
$function$;

revoke all on function public.fn_sistema_automatizaciones_salud() from public, anon;
grant execute on function public.fn_sistema_automatizaciones_salud() to authenticated, service_role;

comment on function public.fn_sistema_automatizaciones_salud() is
  'Estado actual, recuperación e historial de cinco ejecuciones por tarea; exclusivo de superadmin.';
