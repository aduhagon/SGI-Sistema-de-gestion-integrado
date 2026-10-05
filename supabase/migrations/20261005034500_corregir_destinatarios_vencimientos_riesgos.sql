-- Los riesgos se asignan a puestos, mientras que las notificaciones se envian
-- a usuarios. Resolver el ocupante vigente y escalar puestos vacantes a SGI.

create or replace function public.fn_procesar_vencimientos()
returns table(docs_notif integer, ncs_notif integer, riesgos_notif integer, acuses_notif integer)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_docs int := 0; v_ncs int := 0; v_riesgos int := 0; v_acuses int := 0;
  v_aviso_dias int := 7;
begin
  with gestores as (
    select distinct a.usuario_id
    from asignaciones_rol_global a
    join roles_globales rg on rg.id = a.rol_id
    join usuarios u on u.id = a.usuario_id
      and u.activo = true and u.eliminado_en is null
    where rg.codigo in ('admin','responsable_sgi') and a.vigente_hasta is null
  ),
  docs as (
    select d.id, d.codigo, d.titulo, d.proxima_revision
    from documentos d
    where d.proxima_revision is not null and d.eliminado_en is null
      and d.proxima_revision <= current_date + v_aviso_dias
  ),
  ins as (
    insert into notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    select g.usuario_id, 'documento_revision_proxima',
      (case when d.proxima_revision < current_date then 'alta' else 'media' end)::severidad_enum,
      case when d.proxima_revision < current_date then 'Documento con revisión vencida' else 'Documento a revisar pronto' end,
      format('%s — %s %s revisión el %s.', d.codigo, d.titulo,
             case when d.proxima_revision < current_date then 'necesitaba' else 'necesita' end,
             to_char(d.proxima_revision, 'DD/MM/YYYY')),
      'documento', d.id, format('/documentos/%s', d.id), 'job_vencimientos'
    from docs d cross join gestores g
    where not exists (select 1 from notificaciones n where n.tipo='documento_revision_proxima'
      and n.entidad_id=d.id and n.usuario_destino_id=g.usuario_id and n.fecha_envio > now() - interval '7 days')
    returning id
  ) select count(*) into v_docs from ins;

  with ncs as (
    select nc.id, nc.codigo, nc.titulo, nc.fecha_limite_cierre, nc.responsable_tratamiento_id
    from no_conformidades nc
    join usuarios u on u.id = nc.responsable_tratamiento_id
      and u.activo = true and u.eliminado_en is null
    where nc.fecha_limite_cierre is not null and nc.estado <> 'cerrada'
      and nc.fecha_limite_cierre <= current_date + v_aviso_dias
  ),
  ins as (
    insert into notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    select nc.responsable_tratamiento_id, 'nc_vencida',
      (case when nc.fecha_limite_cierre < current_date then 'alta' else 'media' end)::severidad_enum,
      case when nc.fecha_limite_cierre < current_date then 'No conformidad vencida sin cerrar' else 'No conformidad por vencer' end,
      format('%s — %s %s el %s y sigue abierta.', nc.codigo, nc.titulo,
             case when nc.fecha_limite_cierre < current_date then 'venció' else 'vence' end,
             to_char(nc.fecha_limite_cierre, 'DD/MM/YYYY')),
      'no_conformidad', nc.id, format('/ncs/%s', nc.id), 'job_vencimientos'
    from ncs nc
    where not exists (select 1 from notificaciones n where n.tipo='nc_vencida'
      and n.entidad_id=nc.id and n.usuario_destino_id=nc.responsable_tratamiento_id
      and n.fecha_envio > now() - interval '7 days')
    returning id
  ) select count(*) into v_ncs from ins;

  with riesgos_base as (
    select ri.id, ri.codigo, ri.titulo, ri.fecha_revision, ri.responsable_id,
           p.codigo as puesto_codigo, p.nombre as puesto_nombre
    from riesgos ri
    join puestos p on p.id = ri.responsable_id
    where ri.fecha_revision is not null and ri.activo and ri.eliminado_en is null
      and ri.estado in ('identificado','en_tratamiento','materializado')
      and ri.fecha_revision <= current_date + v_aviso_dias
  ),
  ocupantes as (
    select distinct rb.*, u.id as usuario_destino_id, false as puesto_vacante
    from riesgos_base rb
    join persona_puesto pp on pp.puesto_id = rb.responsable_id
      and pp.vigente_hasta is null
    join usuarios u on u.persona_id = pp.persona_id
      and u.activo = true and u.eliminado_en is null
  ),
  gestores as (
    select distinct a.usuario_id
    from asignaciones_rol_global a
    join roles_globales rg on rg.id = a.rol_id
    join usuarios u on u.id = a.usuario_id
      and u.activo = true and u.eliminado_en is null
    where rg.codigo in ('admin','responsable_sgi') and a.vigente_hasta is null
  ),
  destinatarios as (
    select * from ocupantes
    union all
    select rb.*, g.usuario_id, true
    from riesgos_base rb cross join gestores g
    where not exists (
      select 1 from ocupantes o where o.id = rb.id
    )
  ),
  ins as (
    insert into notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    select d.usuario_destino_id, 'riesgo_revision_proxima',
      (case when d.fecha_revision < current_date or d.puesto_vacante then 'alta' else 'media' end)::severidad_enum,
      case
        when d.puesto_vacante then 'Riesgo sin responsable activo'
        when d.fecha_revision < current_date then 'Riesgo con revisión vencida'
        else 'Riesgo a re-evaluar pronto'
      end,
      case
        when d.puesto_vacante then format(
          '%s — %s requiere revisión, pero el puesto responsable %s — %s no tiene un usuario activo asignado.',
          d.codigo, d.titulo, d.puesto_codigo, d.puesto_nombre)
        else format('%s — %s %s re-evaluación el %s.', d.codigo, d.titulo,
          case when d.fecha_revision < current_date then 'necesitaba' else 'necesita' end,
          to_char(d.fecha_revision, 'DD/MM/YYYY'))
      end,
      'riesgo', d.id, '/riesgos', 'job_vencimientos'
    from destinatarios d
    where not exists (
      select 1 from notificaciones n
      where n.tipo='riesgo_revision_proxima'
        and n.entidad_id=d.id
        and n.usuario_destino_id=d.usuario_destino_id
        and n.fecha_envio > now() - interval '7 days'
    )
    returning id
  ) select count(*) into v_riesgos from ins;

  with ac as (
    select al.id, al.usuario_id, al.plazo_objetivo
    from acuses_lectura al
    join usuarios u on u.id = al.usuario_id
      and u.activo = true and u.eliminado_en is null
    where al.plazo_objetivo is not null and al.fecha_acuse is null
      and al.plazo_objetivo <= now() + (v_aviso_dias || ' days')::interval
  ),
  ins as (
    insert into notificaciones
      (usuario_destino_id, tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, url_destino, origen_sistema)
    select ac.usuario_id, 'acuse_pendiente',
      (case when ac.plazo_objetivo < now() then 'alta' else 'media' end)::severidad_enum,
      case when ac.plazo_objetivo < now() then 'Tenés un acuse de lectura vencido' else 'Acuse de lectura por vencer' end,
      format('Tenés un documento pendiente de acuse. El plazo %s el %s.',
             case when ac.plazo_objetivo < now() then 'venció' else 'vence' end,
             to_char(ac.plazo_objetivo, 'DD/MM/YYYY')),
      'acuse', ac.id, '/acuses', 'job_vencimientos'
    from ac
    where not exists (select 1 from notificaciones n where n.tipo='acuse_pendiente'
      and n.entidad_id=ac.id and n.usuario_destino_id=ac.usuario_id
      and n.fecha_envio > now() - interval '7 days')
    returning id
  ) select count(*) into v_acuses from ins;

  return query select v_docs, v_ncs, v_riesgos, v_acuses;
end;
$function$;

revoke all on function public.fn_procesar_vencimientos() from public, anon, authenticated;
grant execute on function public.fn_procesar_vencimientos() to service_role;

comment on function public.fn_procesar_vencimientos() is
  'Procesa avisos de vencimiento; resuelve puestos de riesgos a usuarios vigentes y escala vacantes a SGI.';
