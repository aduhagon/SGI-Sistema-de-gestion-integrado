-- Control diario de continuidad con aviso semanal anti-duplicados.

insert into public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
values
  ('continuidad_alertas_habilitadas', 'false'::jsonb, 'continuidad', 'Habilita alertas automáticas de respaldo y restauración', true),
  ('continuidad_alerta_repetir_dias', '7'::jsonb, 'continuidad', 'Intervalo mínimo entre alertas de continuidad', true)
on conflict (clave) do nothing;

create or replace function public.fn_continuidad_controlar()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_habilitadas boolean := false;
  v_correo_habilitado boolean := false;
  v_destinatario text;
  v_backup_fecha date;
  v_backup_dias integer := 1;
  v_restore_fecha date;
  v_restore_dias integer := 180;
  v_repetir_dias integer := 7;
  v_problemas text[] := array[]::text[];
  v_texto text;
  v_html text;
  v_envio_id uuid;
begin
  select coalesce((valor #>> '{}')::boolean, false) into v_habilitadas
  from configuracion_sistema where clave = 'continuidad_alertas_habilitadas';
  select coalesce((valor #>> '{}')::boolean, false) into v_correo_habilitado
  from configuracion_sistema where clave = 'correo_envio_habilitado';
  select nullif(valor #>> '{}', '') into v_destinatario
  from configuracion_sistema where clave = 'continuidad_responsable';

  if not v_habilitadas then
    return jsonb_build_object('estado', 'deshabilitada', 'enviado', false);
  end if;
  if not v_correo_habilitado then
    return jsonb_build_object('estado', 'correo_deshabilitado', 'enviado', false);
  end if;
  if v_destinatario is null or v_destinatario !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('estado', 'sin_destinatario_valido', 'enviado', false);
  end if;

  select nullif(valor #>> '{}', '')::date into v_backup_fecha
  from configuracion_sistema where clave = 'backup_ultimo_verificado_fecha';
  select greatest(coalesce((valor #>> '{}')::integer, 1), 1) into v_backup_dias
  from configuracion_sistema where clave = 'backup_periodicidad_dias';
  select nullif(valor #>> '{}', '')::date into v_restore_fecha
  from configuracion_sistema where clave = 'restore_ultima_prueba_fecha';
  select greatest(coalesce((valor #>> '{}')::integer, 180), 1) into v_restore_dias
  from configuracion_sistema where clave = 'restore_periodicidad_dias';
  select greatest(coalesce((valor #>> '{}')::integer, 7), 1) into v_repetir_dias
  from configuracion_sistema where clave = 'continuidad_alerta_repetir_dias';

  if v_backup_fecha is null then
    v_problemas := array_append(v_problemas, 'No hay evidencia registrada del último respaldo.');
  elsif current_date - v_backup_fecha > v_backup_dias then
    v_problemas := array_append(v_problemas, format(
      'El respaldo verificado tiene %s días de antigüedad y el máximo configurado es %s.',
      current_date - v_backup_fecha, v_backup_dias));
  end if;

  if v_restore_fecha is null then
    v_problemas := array_append(v_problemas, 'No hay evidencia registrada de una prueba de restauración.');
  elsif current_date - v_restore_fecha > v_restore_dias then
    v_problemas := array_append(v_problemas, format(
      'La prueba de restauración tiene %s días de antigüedad y el máximo configurado es %s.',
      current_date - v_restore_fecha, v_restore_dias));
  end if;

  if cardinality(v_problemas) = 0 then
    return jsonb_build_object('estado', 'vigente', 'enviado', false);
  end if;

  if exists (
    select 1 from envios_correo e
    where e.destinatario = v_destinatario
      and e.asunto = 'Alerta de continuidad · SGI'
      and e.creado_en > now() - make_interval(days => v_repetir_dias)
  ) then
    return jsonb_build_object('estado', 'alerta_ya_enviada', 'enviado', false, 'problemas', to_jsonb(v_problemas));
  end if;

  v_texto := 'El control automático de continuidad detectó:' || E'\n- ' || array_to_string(v_problemas, E'\n- ') ||
    E'\n\nRevisá Respaldo y continuidad en Superadministración.';
  v_html := '<p>El control automático de continuidad detectó:</p><ul><li>' ||
    array_to_string(v_problemas, '</li><li>') ||
    '</li></ul><p>Revisá <strong>Respaldo y continuidad</strong> en Superadministración.</p>';

  v_envio_id := public.fn_correo_despachar(
    v_destinatario,
    'Alerta de continuidad · SGI',
    v_texto,
    v_html,
    'otro'::public.origen_correo,
    null
  );

  return jsonb_build_object('estado', 'alerta_encolada', 'enviado', true, 'envioId', v_envio_id, 'problemas', to_jsonb(v_problemas));
end;
$function$;

revoke all on function public.fn_continuidad_controlar() from public, anon, authenticated;
grant execute on function public.fn_continuidad_controlar() to service_role;

do $block$
begin
  if not exists (select 1 from cron.job where jobname = 'sgi-continuidad') then
    perform cron.schedule(
      'sgi-continuidad',
      '0 12 * * *',
      'select public.fn_continuidad_controlar()'
    );
  end if;
end;
$block$;

comment on function public.fn_continuidad_controlar() is
  'Verifica evidencias de respaldo y restauración; encola una alerta con frecuencia limitada.';
