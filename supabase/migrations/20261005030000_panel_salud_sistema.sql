-- Diagnostico global de solo lectura para Superadministracion.

create or replace function public.fn_sistema_panel_salud()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, storage
as $function$
declare
  v_almacenamiento jsonb;
  v_automatizaciones jsonb;
begin
  if not coalesce(public.fn_es_superadmin(), false) then
    raise exception 'Solo el superadministrador puede consultar la salud del sistema.';
  end if;

  select jsonb_build_object(
    'objetos', count(*)::int,
    'bytes', coalesce(sum(
      case
        when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
          then (o.metadata ->> 'size')::bigint
        else 0
      end
    ), 0)
  )
  into v_almacenamiento
  from storage.objects o;

  select jsonb_build_object(
    'total', count(*)::int,
    'activas', count(*) filter (where j.active)::int,
    'fallosSieteDias', coalesce(sum(coalesce(r.fallos, 0)), 0)::int,
    'jobs', coalesce(jsonb_agg(
      jsonb_build_object(
        'nombre', coalesce(j.jobname, 'Tarea ' || j.jobid::text),
        'programacion', j.schedule,
        'activa', j.active,
        'ultimoEstado', r.ultimo_estado,
        'ultimaEjecucion', r.ultima_ejecucion,
        'ultimoMensaje', left(r.ultimo_mensaje, 300)
      ) order by coalesce(j.jobname, j.jobid::text)
    ), '[]'::jsonb)
  )
  into v_automatizaciones
  from cron.job j
  left join lateral (
    select
      (array_agg(d.status order by d.start_time desc))[1] as ultimo_estado,
      max(d.start_time) as ultima_ejecucion,
      (array_agg(d.return_message order by d.start_time desc))[1] as ultimo_mensaje,
      count(*) filter (
        where d.start_time >= now() - interval '7 days'
          and d.status not in ('succeeded', 'running')
      )::int as fallos
    from cron.job_run_details d
    where d.jobid = j.jobid
  ) r on true;

  return jsonb_build_object(
    'consultadoEn', now(),
    'baseDatos', jsonb_build_object(
      'operativa', true,
      'horaServidor', now()
    ),
    'almacenamiento', coalesce(v_almacenamiento, jsonb_build_object('objetos', 0, 'bytes', 0)),
    'automatizaciones', coalesce(v_automatizaciones, jsonb_build_object(
      'total', 0,
      'activas', 0,
      'fallosSieteDias', 0,
      'jobs', '[]'::jsonb
    ))
  );
end;
$function$;

revoke all on function public.fn_sistema_panel_salud() from public, anon;
grant execute on function public.fn_sistema_panel_salud() to authenticated, service_role;

comment on function public.fn_sistema_panel_salud() is
  'Diagnostico global de solo lectura, protegido por rol superadmin.';
