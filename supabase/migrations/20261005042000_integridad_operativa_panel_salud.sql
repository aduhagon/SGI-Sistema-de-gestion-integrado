-- Suma controles preventivos de integridad al panel de salud.

create or replace function public.fn_sistema_panel_salud()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, storage
as $function$
declare
  v_almacenamiento jsonb;
  v_automatizaciones jsonb;
  v_integridad jsonb;
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

  with riesgos_vacantes as (
    select r.id, r.codigo, r.titulo, p.codigo as puesto_codigo, p.nombre as puesto_nombre
    from public.riesgos r
    join public.puestos p on p.id = r.responsable_id
    where r.activo = true and r.eliminado_en is null
      and not exists (
        select 1
        from public.persona_puesto pp
        join public.usuarios u on u.persona_id = pp.persona_id
          and u.activo = true and u.eliminado_en is null
        where pp.puesto_id = r.responsable_id
          and pp.vigente_hasta is null
      )
  ),
  ncs_inactivas as (
    select count(*)::int as cantidad
    from public.no_conformidades nc
    join public.usuarios u on u.id = nc.responsable_tratamiento_id
    where nc.estado <> 'cerrada'
      and (u.activo = false or u.eliminado_en is not null)
  ),
  acuses_inactivos as (
    select count(*)::int as cantidad
    from public.acuses_lectura a
    join public.usuarios u on u.id = a.usuario_id
    where a.fecha_acuse is null
      and (u.activo = false or u.eliminado_en is not null)
  )
  select jsonb_build_object(
    'riesgosPuestoVacante', (select count(*)::int from riesgos_vacantes),
    'ncsResponsableInactivo', (select cantidad from ncs_inactivas),
    'acusesUsuarioInactivo', (select cantidad from acuses_inactivos),
    'alertas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', 'riesgo_puesto_vacante',
        'codigo', rv.codigo,
        'titulo', rv.titulo,
        'detalle', rv.puesto_codigo || ' — ' || rv.puesto_nombre,
        'url', '/riesgos'
      ) order by rv.codigo)
      from (select * from riesgos_vacantes order by codigo limit 10) rv
    ), '[]'::jsonb)
  )
  into v_integridad;

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
    )),
    'integridad', coalesce(v_integridad, jsonb_build_object(
      'riesgosPuestoVacante', 0,
      'ncsResponsableInactivo', 0,
      'acusesUsuarioInactivo', 0,
      'alertas', '[]'::jsonb
    ))
  );
end;
$function$;

revoke all on function public.fn_sistema_panel_salud() from public, anon;
grant execute on function public.fn_sistema_panel_salud() to authenticated, service_role;

comment on function public.fn_sistema_panel_salud() is
  'Diagnostico global e integridad operativa, protegido por rol superadmin.';
