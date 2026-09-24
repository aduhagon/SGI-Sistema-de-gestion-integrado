create or replace function public.guardar_requisito_legal_atomico(
 p_id uuid, p_datos jsonb, p_procesos uuid[], p_certificaciones uuid[]
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
 v public.requisitos_legales%rowtype;
 actor uuid := public.fn_usuario_id_actual();
 rid uuid;
 esperado integer;
 afectado integer;
begin
 if auth.uid() is null or actor is null then raise exception 'Sesión no válida'; end if;
 if p_procesos is null or p_certificaciones is null then raise exception 'Asociaciones incompletas'; end if;
 v := jsonb_populate_record(null::public.requisitos_legales,p_datos);
 if v.codigo is null or length(trim(v.codigo)) < 2 or v.titulo is null or length(trim(v.titulo)) < 3 then
   raise exception 'Código y título obligatorios';
 end if;
 if v.norma_id is not null and not exists(
   select 1 from public.normas where id=v.norma_id and activo and eliminado_en is null and ambito like 'Marco legal%'
 ) then raise exception 'La norma de origen debe pertenecer al marco legal'; end if;
 if exists(select 1 from unnest(p_certificaciones) x where not exists(
   select 1 from versiones_norma vn join normas n on n.id=vn.norma_id
   where vn.id=x and vn.eliminado_en is null and n.activo and n.eliminado_en is null
   and (n.ambito is null or n.ambito not like 'Marco legal%')
 )) then raise exception 'Certificación inválida'; end if;
 if p_id is null then
   insert into requisitos_legales(codigo,titulo,descripcion,tipo,jurisdiccion,organismo_emisor,referencia,fecha_vigencia_desde,url_fuente,norma_id,criticidad,observaciones,creado_por)
   values(v.codigo,v.titulo,v.descripcion,v.tipo,v.jurisdiccion,v.organismo_emisor,v.referencia,v.fecha_vigencia_desde,v.url_fuente,v.norma_id,v.criticidad,v.observaciones,actor)
   returning id into rid;
 else
   update requisitos_legales set codigo=v.codigo,titulo=v.titulo,descripcion=v.descripcion,tipo=v.tipo,
   jurisdiccion=v.jurisdiccion,organismo_emisor=v.organismo_emisor,referencia=v.referencia,
   fecha_vigencia_desde=v.fecha_vigencia_desde,url_fuente=v.url_fuente,norma_id=v.norma_id,
   criticidad=v.criticidad,observaciones=v.observaciones,actualizado_por=actor,actualizado_en=now()
   where id=p_id and eliminado_en is null returning id into rid;
   if rid is null then raise exception 'No se pudo editar: requisito inexistente o sin permisos'; end if;
 end if;
 select count(*) into esperado from requisito_legal_proceso where requisito_legal_id=rid and eliminado_en is null and not(proceso_id=any(p_procesos));
 update requisito_legal_proceso set activo=false,eliminado_en=now(),eliminado_por=actor,eliminado_motivo='Desvinculado al editar requisito'
 where requisito_legal_id=rid and eliminado_en is null and not(proceso_id=any(p_procesos));
 get diagnostics afectado=row_count;
 if esperado<>afectado then raise exception 'Sin permisos para desvincular procesos'; end if;
 insert into requisito_legal_proceso(requisito_legal_id,proceso_id,creado_por)
 select rid,x,actor from (select distinct unnest(p_procesos) x) a
 where not exists(select 1 from requisito_legal_proceso where requisito_legal_id=rid and proceso_id=x and eliminado_en is null);
 select count(*) into esperado from requisito_legal_norma where requisito_legal_id=rid and eliminado_en is null and not(version_norma_id=any(p_certificaciones));
 update requisito_legal_norma set activo=false,eliminado_en=now(),eliminado_por=actor,eliminado_motivo='Desvinculada al editar requisito'
 where requisito_legal_id=rid and eliminado_en is null and not(version_norma_id=any(p_certificaciones));
 get diagnostics afectado=row_count;
 if esperado<>afectado then raise exception 'Sin permisos para desvincular certificaciones'; end if;
 insert into requisito_legal_norma(requisito_legal_id,version_norma_id,creado_por)
 select rid,x,actor from (select distinct unnest(p_certificaciones) x) a
 where not exists(select 1 from requisito_legal_norma where requisito_legal_id=rid and version_norma_id=x and eliminado_en is null);
 return rid;
end;
$$;
revoke all on function public.guardar_requisito_legal_atomico(uuid,jsonb,uuid[],uuid[]) from public, anon;
grant execute on function public.guardar_requisito_legal_atomico(uuid,jsonb,uuid[],uuid[]) to authenticated;
