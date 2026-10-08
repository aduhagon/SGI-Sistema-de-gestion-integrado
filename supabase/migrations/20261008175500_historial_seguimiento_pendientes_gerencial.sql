create table if not exists public.seguimiento_pendientes_gerencial_historial (
  id uuid primary key default gen_random_uuid(),
  seguimiento_id uuid not null references public.seguimiento_pendientes_gerencial(id) on delete cascade,
  modulo text not null,
  entidad_id uuid not null,
  responsable_clave text not null,
  estado_anterior text,
  estado_nuevo text not null check (estado_nuevo in ('sin_revisar', 'en_curso', 'bloqueado', 'contactado')),
  nota_anterior text,
  nota_nueva text,
  cambiado_por uuid references public.usuarios(id),
  cambiado_en timestamptz not null default now()
);

create index if not exists idx_seguimiento_pendientes_historial_lookup
  on public.seguimiento_pendientes_gerencial_historial(modulo, entidad_id, responsable_clave, cambiado_en desc);

create index if not exists idx_seguimiento_pendientes_historial_seguimiento
  on public.seguimiento_pendientes_gerencial_historial(seguimiento_id, cambiado_en desc);

create index if not exists idx_seguimiento_pendientes_historial_cambiado_por
  on public.seguimiento_pendientes_gerencial_historial(cambiado_por);

alter table public.seguimiento_pendientes_gerencial_historial enable row level security;

revoke all on public.seguimiento_pendientes_gerencial_historial from public, anon, authenticated;
grant all on public.seguimiento_pendientes_gerencial_historial to service_role;

drop policy if exists seguimiento_pendientes_historial_sin_acceso_directo
  on public.seguimiento_pendientes_gerencial_historial;

create policy seguimiento_pendientes_historial_sin_acceso_directo
  on public.seguimiento_pendientes_gerencial_historial
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.fn_historial_seguimiento_pendientes_gerencial()
returns table (
  modulo text,
  entidad_id uuid,
  responsable_clave text,
  estado_anterior text,
  estado_nuevo text,
  nota_anterior text,
  nota_nueva text,
  cambiado_en timestamptz,
  cambiado_por uuid,
  cambiado_por_nombre text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.fn_usuario_id_actual();
begin
  if v_usuario_id is null then
    raise exception 'Sesion no valida.';
  end if;

  if not private.fn_usuario_es_gestor_sgi() then
    raise exception 'Solo un administrador o responsable del SGI puede consultar el historial gerencial.';
  end if;

  return query
  select
    h.modulo,
    h.entidad_id,
    h.responsable_clave,
    h.estado_anterior,
    h.estado_nuevo,
    h.nota_anterior,
    h.nota_nueva,
    h.cambiado_en,
    h.cambiado_por,
    coalesce(nullif(btrim(concat(coalesce(p.nombre, ''), ' ', coalesce(p.apellido, ''))), ''), u.username) as cambiado_por_nombre
  from public.seguimiento_pendientes_gerencial_historial h
  left join public.usuarios u on u.id = h.cambiado_por
  left join public.personas p on p.id = u.persona_id
  order by h.cambiado_en desc;
end;
$$;

create or replace function public.fn_guardar_seguimiento_pendiente_gerencial(
  p_modulo text,
  p_entidad_id uuid,
  p_responsable_clave text,
  p_responsable_nombre text,
  p_estado text,
  p_nota text default null
)
returns table (
  modulo text,
  entidad_id uuid,
  responsable_clave text,
  responsable_nombre text,
  estado text,
  nota text,
  actualizado_en timestamptz,
  actualizado_por uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.fn_usuario_id_actual();
  v_estado text := nullif(btrim(coalesce(p_estado, '')), '');
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
  v_modulo text := btrim(coalesce(p_modulo, ''));
  v_responsable_clave text := btrim(coalesce(p_responsable_clave, ''));
  v_responsable_nombre text := coalesce(nullif(btrim(p_responsable_nombre), ''), 'Sin responsable');
  v_actual public.seguimiento_pendientes_gerencial%rowtype;
  v_resultado public.seguimiento_pendientes_gerencial%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Sesion no valida.';
  end if;

  if not private.fn_usuario_es_gestor_sgi() then
    raise exception 'Solo un administrador o responsable del SGI puede actualizar el seguimiento gerencial.';
  end if;

  if v_modulo = '' then
    raise exception 'El modulo es obligatorio.';
  end if;

  if p_entidad_id is null then
    raise exception 'La entidad es obligatoria.';
  end if;

  if v_responsable_clave = '' then
    raise exception 'El responsable es obligatorio.';
  end if;

  if v_estado not in ('sin_revisar', 'en_curso', 'bloqueado', 'contactado') then
    raise exception 'Estado de seguimiento invalido.';
  end if;

  select *
    into v_actual
  from public.seguimiento_pendientes_gerencial s
  where s.modulo = v_modulo
    and s.entidad_id = p_entidad_id
    and s.responsable_clave = v_responsable_clave
  for update;

  if v_actual.id is null then
    insert into public.seguimiento_pendientes_gerencial (
      modulo,
      entidad_id,
      responsable_clave,
      responsable_nombre,
      estado,
      nota,
      actualizado_por
    )
    values (
      v_modulo,
      p_entidad_id,
      v_responsable_clave,
      v_responsable_nombre,
      v_estado,
      v_nota,
      v_usuario_id
    )
    returning * into v_resultado;

    insert into public.seguimiento_pendientes_gerencial_historial (
      seguimiento_id,
      modulo,
      entidad_id,
      responsable_clave,
      estado_anterior,
      estado_nuevo,
      nota_anterior,
      nota_nueva,
      cambiado_por
    )
    values (
      v_resultado.id,
      v_resultado.modulo,
      v_resultado.entidad_id,
      v_resultado.responsable_clave,
      null,
      v_resultado.estado,
      null,
      v_resultado.nota,
      v_usuario_id
    );
  else
    update public.seguimiento_pendientes_gerencial s
    set
      responsable_nombre = v_responsable_nombre,
      estado = v_estado,
      nota = v_nota,
      actualizado_por = v_usuario_id,
      actualizado_en = now()
    where s.id = v_actual.id
    returning * into v_resultado;

    if v_actual.estado is distinct from v_resultado.estado
      or v_actual.nota is distinct from v_resultado.nota then
      insert into public.seguimiento_pendientes_gerencial_historial (
        seguimiento_id,
        modulo,
        entidad_id,
        responsable_clave,
        estado_anterior,
        estado_nuevo,
        nota_anterior,
        nota_nueva,
        cambiado_por
      )
      values (
        v_resultado.id,
        v_resultado.modulo,
        v_resultado.entidad_id,
        v_resultado.responsable_clave,
        v_actual.estado,
        v_resultado.estado,
        v_actual.nota,
        v_resultado.nota,
        v_usuario_id
      );
    end if;
  end if;

  return query
  select
    v_resultado.modulo,
    v_resultado.entidad_id,
    v_resultado.responsable_clave,
    v_resultado.responsable_nombre,
    v_resultado.estado,
    v_resultado.nota,
    v_resultado.actualizado_en,
    v_resultado.actualizado_por;
end;
$$;

revoke all on function public.fn_historial_seguimiento_pendientes_gerencial() from public, anon, authenticated;
grant execute on function public.fn_historial_seguimiento_pendientes_gerencial() to authenticated, service_role;

revoke all on function public.fn_guardar_seguimiento_pendiente_gerencial(text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_guardar_seguimiento_pendiente_gerencial(text, uuid, text, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
