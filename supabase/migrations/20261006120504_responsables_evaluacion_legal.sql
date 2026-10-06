alter table public.requisitos_legales add column responsable_evaluacion_puesto_id uuid references public.puestos(id);
create index idx_requisitos_responsable_evaluacion on public.requisitos_legales(responsable_evaluacion_puesto_id) where eliminado_en is null;

-- Conserva el guardado atómico y las políticas existentes. La interfaz anterior
-- no borra una asignación cuando no envía la nueva clave.
do $migration$
declare d text; nuevo text;
begin
 d := pg_get_functiondef('public.guardar_requisito_legal_atomico(uuid,jsonb,uuid[],uuid[])'::regprocedure);
 nuevo := replace(d, 'observaciones,creado_por)', 'observaciones,responsable_evaluacion_puesto_id,creado_por)');
 nuevo := replace(nuevo, 'v.observaciones,actor)', 'v.observaciones,v.responsable_evaluacion_puesto_id,actor)');
 nuevo := replace(nuevo, 'observaciones=v.observaciones,actualizado_por=actor', 'observaciones=v.observaciones,responsable_evaluacion_puesto_id=case when p_datos ? ''responsable_evaluacion_puesto_id'' then v.responsable_evaluacion_puesto_id else responsable_evaluacion_puesto_id end,actualizado_por=actor');
 if nuevo=d or position('case when p_datos ?' in nuevo)=0 then raise exception 'Contrato de guardado no reconocido'; end if;
 execute nuevo;
end $migration$;

create function public.fn_validar_responsable_legal() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.responsable_evaluacion_puesto_id is not null and
    (tg_op='INSERT' or new.responsable_evaluacion_puesto_id is distinct from old.responsable_evaluacion_puesto_id) and
    not exists(select 1 from public.puestos where id=new.responsable_evaluacion_puesto_id and activo and eliminado_en is null) then
   raise exception 'El puesto responsable debe estar activo';
 end if;
 return new;
end $$;
revoke all on function public.fn_validar_responsable_legal() from public,anon;
create trigger validar_responsable_legal before insert or update on public.requisitos_legales for each row execute function public.fn_validar_responsable_legal();

create function public.fn_contexto_responsables_legales() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare resultado jsonb;
begin
 if auth.uid() is null or public.fn_usuario_id_actual() is null then raise exception 'Sesión no válida'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',r.id,'puestoId',r.responsable_evaluacion_puesto_id,'puestoNombre',p.nombre,
  'esResponsable',exists(select 1 from public.persona_puesto pp join public.usuarios u on u.persona_id=pp.persona_id join public.personas pe on pe.id=pp.persona_id where pp.puesto_id=p.id and pp.vigente_desde<=now() and (pp.vigente_hasta is null or pp.vigente_hasta>now()) and u.id=public.fn_usuario_id_actual() and u.activo and u.eliminado_en is null and pe.activo and pe.eliminado_en is null and p.activo and p.eliminado_en is null),
  'estado',case when p.id is null then 'sin_asignar' when not p.activo or p.eliminado_en is not null then 'puesto_inactivo'
  when not exists(select 1 from public.persona_puesto pp join public.usuarios u on u.persona_id=pp.persona_id join public.personas pe on pe.id=pp.persona_id where pp.puesto_id=p.id and pp.vigente_desde<=now() and (pp.vigente_hasta is null or pp.vigente_hasta>now()) and u.activo and u.eliminado_en is null and pe.activo and pe.eliminado_en is null) then 'sin_usuario_habilitado' else 'asignado' end
 )), '[]'::jsonb) into resultado
 from public.requisitos_legales r left join public.puestos p on p.id=r.responsable_evaluacion_puesto_id where r.eliminado_en is null;
 return jsonb_build_object('gestion',public.fn_usuario_es_auditor_o_sgi() or public.fn_usuario_es_admin(),'requisitos',resultado);
end $$;
revoke all on function public.fn_contexto_responsables_legales() from public,anon;
grant execute on function public.fn_contexto_responsables_legales() to authenticated;
