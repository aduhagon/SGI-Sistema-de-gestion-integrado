-- Centro funcional de notificaciones para superadministración.
-- Mantiene las credenciales SMTP en secrets y lleva a configuración editable
-- únicamente los parámetros operativos.

insert into public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
values
  ('correo_reply_to', '""'::jsonb, 'correo', 'Dirección que recibe respuestas a los correos del sistema', true),
  ('correo_responsable_sgi', '""'::jsonb, 'correo', 'Contacto funcional responsable del SGI', true),
  ('correo_alertas_tecnicas', '""'::jsonb, 'correo', 'Destinatario de alertas técnicas de automatizaciones', true),
  ('resumen_semanal_dia', '1'::jsonb, 'correo', 'Día ISO del resumen semanal: 1 lunes a 7 domingo', true),
  ('resumen_semanal_hora', '"08:00"'::jsonb, 'correo', 'Hora local de envío del resumen semanal', true)
on conflict (clave) do nothing;

create or replace function public.fn_set_configuracion(p_clave text, p_valor jsonb)
returns table(ok boolean, mensaje text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_editable boolean;
  v_anterior jsonb;
  v_usuario_id uuid;
  v_usuario_email text;
begin
  if not public.fn_es_superadmin() then
    return query select false, 'Solo el superadministrador puede cambiar la configuración.'; return;
  end if;

  select editable, valor into v_editable, v_anterior
  from public.configuracion_sistema where clave = p_clave;

  if v_editable is null then
    return query select false, 'Clave de configuración inexistente.'; return;
  end if;
  if v_editable = false then
    return query select false, 'Esta configuración no es editable.'; return;
  end if;
  if v_anterior is not distinct from p_valor then
    return query select true, 'La configuración ya tenía ese valor.'; return;
  end if;

  v_usuario_id := public.fn_current_user_id();
  if v_usuario_id is not null then
    select u.username into v_usuario_email from public.usuarios u where u.id = v_usuario_id;
  end if;

  update public.configuracion_sistema
  set valor = p_valor, actualizado_en = now(), actualizado_por = v_usuario_id
  where clave = p_clave;

  insert into public.eventos_auditoria (
    timestamp_utc, usuario_id, usuario_email_snapshot, accion,
    entidad_tipo, entidad_id, descripcion, datos_antes, datos_despues, hash_propio, metadata
  ) values (
    now(), v_usuario_id, v_usuario_email, 'configurar',
    'configuracion_sistema', null, format('Configuró %s', p_clave),
    jsonb_build_object('clave', p_clave, 'valor', v_anterior),
    jsonb_build_object('clave', p_clave, 'valor', p_valor),
    'placeholder_recalculado_por_trigger',
    jsonb_build_object('origen', 'superadministracion')
  );

  return query select true, 'Configuración actualizada.';
end;
$$;

revoke all on function public.fn_set_configuracion(text, jsonb) from public, anon;
grant execute on function public.fn_set_configuracion(text, jsonb) to authenticated;

create or replace function public.fn_configurar_resumen_semanal(p_dia integer, p_hora text)
returns table(ok boolean, mensaje text)
language plpgsql
security definer
set search_path = public, cron, pg_temp
as $$
declare
  v_zona text;
  v_fecha_local date;
  v_instante_local timestamp;
  v_instante_utc timestamptz;
  v_hora time;
  v_dias integer;
  v_cron text;
  v_job_id bigint;
begin
  if not public.fn_es_superadmin() then
    return query select false, 'Solo el superadministrador puede cambiar la programación.'; return;
  end if;
  if p_dia not between 1 and 7 then
    return query select false, 'El día seleccionado no es válido.'; return;
  end if;
  if p_hora !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    return query select false, 'La hora debe tener formato HH:MM.'; return;
  end if;

  select coalesce(valor #>> '{}', 'America/Argentina/Buenos_Aires')
  into v_zona from public.configuracion_sistema where clave = 'zona_horaria';
  v_hora := p_hora::time;
  v_fecha_local := (now() at time zone v_zona)::date;
  v_dias := (p_dia - extract(isodow from v_fecha_local)::integer + 7) % 7;
  v_instante_local := (v_fecha_local + v_dias) + v_hora;
  if v_instante_local <= (now() at time zone v_zona) then
    v_instante_local := v_instante_local + interval '7 days';
  end if;
  v_instante_utc := v_instante_local at time zone v_zona;
  v_cron := format('%s %s * * %s',
    extract(minute from v_instante_utc)::integer,
    extract(hour from v_instante_utc)::integer,
    extract(dow from v_instante_utc)::integer
  );

  select jobid into v_job_id from cron.job where jobname = 'sgi-resumen-semanal';
  if v_job_id is null then
    return query select false, 'No se encontró la automatización del resumen semanal.'; return;
  end if;

  perform public.fn_set_configuracion('resumen_semanal_dia', to_jsonb(p_dia));
  perform public.fn_set_configuracion('resumen_semanal_hora', to_jsonb(p_hora));
  perform cron.alter_job(job_id := v_job_id, schedule := v_cron);

  return query select true, format('Resumen programado para el día %s a las %s (%s).', p_dia, p_hora, v_zona);
end;
$$;

revoke all on function public.fn_configurar_resumen_semanal(integer, text) from public, anon;
grant execute on function public.fn_configurar_resumen_semanal(integer, text) to authenticated;

create or replace function public.fn_correo_enviar_prueba(p_destinatario text)
returns table(ok boolean, mensaje text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.fn_es_superadmin() then
    return query select false, 'Solo el superadministrador puede enviar pruebas.'; return;
  end if;
  if p_destinatario is null or p_destinatario !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return query select false, 'Ingresá un destinatario válido.'; return;
  end if;

  v_id := public.fn_correo_despachar(
    p_destinatario,
    'Prueba de correo · SGI',
    'Este mensaje confirma que el canal de correo del SGI está operativo.',
    '<p>Este mensaje confirma que el canal de correo del <strong>SGI</strong> está operativo.</p>',
    'manual'::public.origen_correo,
    public.fn_current_user_id()
  );
  return query select true, format('Correo de prueba encolado. Referencia: %s', v_id);
end;
$$;

revoke all on function public.fn_correo_enviar_prueba(text) from public, anon;
grant execute on function public.fn_correo_enviar_prueba(text) to authenticated;

