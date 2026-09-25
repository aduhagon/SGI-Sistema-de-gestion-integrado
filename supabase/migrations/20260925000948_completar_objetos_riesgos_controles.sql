create or replace function public.fn_auditoria_vinculo_legible(
  p_entidad_tipo text,
  p_datos jsonb
)
returns text
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_izquierda text;
  v_derecha text;
begin
  case p_entidad_tipo
    when 'requisito_proceso' then
      select trim(concat_ws(' — ', r.clausula, r.titulo)) into v_izquierda
      from public.requisitos r where r.id = nullif(p_datos->>'requisito_id', '')::uuid;
      select trim(concat_ws(' — ', p.codigo, p.nombre)) into v_derecha
      from public.procesos p where p.id = nullif(p_datos->>'proceso_id', '')::uuid;
      return nullif(trim(concat_ws(' · ', v_izquierda, 'Proceso ' || v_derecha)), '');

    when 'control_riesgo' then
      select trim(concat_ws(' — ', c.codigo, c.nombre)) into v_izquierda
      from public.controles c where c.id = nullif(p_datos->>'control_id', '')::uuid;
      select trim(concat_ws(' — ', r.codigo, r.titulo)) into v_derecha
      from public.riesgos r where r.id = nullif(p_datos->>'riesgo_id', '')::uuid;
      return nullif(trim(concat_ws(' · ', 'Control ' || v_izquierda, 'Riesgo ' || v_derecha)), '');

    when 'control_documento' then
      select trim(concat_ws(' — ', c.codigo, c.nombre)) into v_izquierda
      from public.controles c where c.id = nullif(p_datos->>'control_id', '')::uuid;
      select trim(concat_ws(' — ', d.codigo, d.titulo)) into v_derecha
      from public.documentos d where d.id = nullif(p_datos->>'documento_id', '')::uuid;
      return nullif(trim(concat_ws(' · ', 'Control ' || v_izquierda, 'Documento ' || v_derecha)), '');

    when 'control_indicador' then
      select trim(concat_ws(' — ', c.codigo, c.nombre)) into v_izquierda
      from public.controles c where c.id = nullif(p_datos->>'control_id', '')::uuid;
      select trim(concat_ws(' — ', i.codigo, i.nombre)) into v_derecha
      from public.indicadores i where i.id = nullif(p_datos->>'indicador_id', '')::uuid;
      return nullif(trim(concat_ws(' · ', 'Control ' || v_izquierda, 'Indicador ' || v_derecha)), '');

    else
      return null;
  end case;
end;
$$;

revoke all on function public.fn_auditoria_vinculo_legible(text, jsonb)
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
        fn_auditoria_vinculo_legible(e.entidad_tipo, coalesce(e.datos_despues, e.datos_antes)),
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
          when 'requisito_proceso' then 'una asignación de requisito a proceso'
          when 'control_riesgo' then 'una relación entre control y riesgo'
          when 'control_documento' then 'una relación entre control y documento'
          when 'control_indicador' then 'una relación entre control e indicador'
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
