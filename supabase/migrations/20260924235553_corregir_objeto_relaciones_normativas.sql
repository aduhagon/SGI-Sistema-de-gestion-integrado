create or replace function public.fn_auditoria_relacion_normativa_legible(
  p_entidad_id uuid,
  p_datos jsonb
)
returns text
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_origen_id uuid := nullif(p_datos->>'norma_origen_id', '')::uuid;
  v_destino_id uuid := nullif(p_datos->>'norma_destino_id', '')::uuid;
  v_tipo text := nullif(p_datos->>'tipo', '');
  v_origen text;
  v_destino text;
begin
  if v_origen_id is null or v_destino_id is null then
    select nr.norma_origen_id, nr.norma_destino_id, nr.tipo
      into v_origen_id, v_destino_id, v_tipo
    from public.normas_relaciones nr
    where nr.id = p_entidad_id;
  end if;

  select coalesce(nullif(n.nombre_corto, ''), n.codigo)
    into v_origen
  from public.normas n
  where n.id = v_origen_id;

  select coalesce(nullif(n.nombre_corto, ''), n.codigo)
    into v_destino
  from public.normas n
  where n.id = v_destino_id;

  return nullif(trim(concat_ws(' ',
    v_origen,
    case v_tipo
      when 'depende_de' then 'depende de'
      when 'reglamenta' then 'reglamenta'
      when 'complementa' then 'complementa'
      when 'modifica' then 'modifica'
      when 'sustituye' then 'sustituye'
      when 'deroga' then 'deroga'
      else replace(coalesce(v_tipo, ''), '_', ' ')
    end,
    v_destino
  )), '');
end;
$$;

revoke all on function public.fn_auditoria_relacion_normativa_legible(uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.fn_auditoria_listar(
  p_desde timestamp with time zone default null,
  p_hasta timestamp with time zone default null,
  p_usuario text default null,
  p_accion text default null,
  p_entidad text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_filas jsonb;
begin
  if not fn_usuario_es_auditor_o_sgi() then
    return jsonb_build_object('ok', false, 'error', 'Acceso restringido a administradores.');
  end if;

  select count(*) into v_total
  from eventos_auditoria e
  where (p_desde is null or e.timestamp_utc >= p_desde)
    and (p_hasta is null or e.timestamp_utc < p_hasta)
    and (p_usuario is null or e.usuario_email_snapshot ilike '%' || p_usuario || '%')
    and (p_accion is null or e.accion::text = p_accion)
    and (p_entidad is null or e.entidad_tipo = p_entidad);

  select coalesce(jsonb_agg(fila order by (fila->>'id')::bigint desc), '[]'::jsonb)
    into v_filas
  from (
    select jsonb_build_object(
      'id', e.id,
      'timestamp_utc', e.timestamp_utc,
      'usuario_email', e.usuario_email_snapshot,
      'accion', e.accion::text,
      'entidad_tipo', e.entidad_tipo,
      'entidad_id', e.entidad_id,
      'descripcion', e.descripcion,
      'objeto', coalesce(
        case when e.entidad_tipo = 'normas_relaciones'
          then fn_auditoria_relacion_normativa_legible(e.entidad_id, coalesce(e.datos_despues, e.datos_antes))
        end,
        fn_auditoria_objeto_legible(e.entidad_tipo, e.entidad_id, e.datos_despues),
        nullif(trim(concat_ws(' — ',
          coalesce(e.datos_despues->>'codigo', e.datos_despues->>'rol_en_proceso'),
          coalesce(e.datos_despues->>'titulo', e.datos_despues->>'nombre', e.datos_despues->>'estado')
        )), '')
      ),
      'accion_legible', concat_ws(' ',
        case e.accion::text
          when 'crear' then 'Creó' when 'modificar' then 'Modificó'
          when 'eliminar_logico' then 'Dio de baja' when 'restaurar' then 'Restauró'
          when 'aprobar' then 'Aprobó' when 'rechazar' then 'Rechazó'
          when 'firmar' then 'Firmó' when 'acusar_lectura' then 'Acusó lectura de'
          when 'descargar' then 'Descargó' when 'login' then 'Inició sesión'
          when 'logout' then 'Cerró sesión' when 'configurar' then 'Configuró'
          when 'verificar_integridad' then 'Verificó integridad de'
          else e.accion::text
        end,
        case e.entidad_tipo
          when 'documentos' then 'un documento' when 'versiones' then 'una versión'
          when 'aprobaciones' then 'una aprobación' when 'acuses_lectura' then 'un acuse de lectura'
          when 'no_conformidades' then 'una no conformidad' when 'hallazgos' then 'un hallazgo'
          when 'acciones' then 'una acción' when 'auditorias' then 'una auditoría'
          when 'auditoria_checklist_items' then 'un ítem de checklist'
          when 'coberturas' then 'una cobertura'
          when 'referencias_normativas' then 'una referencia normativa'
          when 'normas_relaciones' then 'una relación normativa'
          when 'version_fragmentos' then 'los bloques de una versión' when 'archivos' then 'un archivo'
          when 'asignacion_rol_global' then 'un rol global' when 'puesto_proceso_rol' then 'un rol en proceso'
          when 'participacion_usuario_proceso' then 'una participación en proceso'
          when 'procesos' then 'un proceso' when 'normas' then 'una norma'
          when 'puestos' then 'un puesto' when 'areas' then 'un área'
          when 'tipos_documentales' then 'un tipo documental' when 'usuarios' then 'un usuario'
          else e.entidad_tipo
        end
      )
    ) as fila
    from eventos_auditoria e
    where (p_desde is null or e.timestamp_utc >= p_desde)
      and (p_hasta is null or e.timestamp_utc < p_hasta)
      and (p_usuario is null or e.usuario_email_snapshot ilike '%' || p_usuario || '%')
      and (p_accion is null or e.accion::text = p_accion)
      and (p_entidad is null or e.entidad_tipo = p_entidad)
    order by e.id desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) sub;

  return jsonb_build_object('ok', true, 'total', v_total, 'eventos', v_filas);
end;
$$;
