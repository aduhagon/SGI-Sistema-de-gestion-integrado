do $$
declare
  v_version_brcgs uuid;
  v_requisitos integer;
  v_asociaciones integer;
begin
  select v.id into strict v_version_brcgs
  from public.versiones_norma v
  join public.normas n on n.id = v.norma_id
  where n.codigo = 'BRCGS'
    and n.estado_gestion = 'activa'
    and n.activo = true
    and n.eliminado_en is null
    and v.es_version_actual = true
    and v.activo = true
    and v.eliminado_en is null;

  select count(*) into v_requisitos
  from public.requisitos_legales r
  join public.normas marco on marco.id = r.norma_id
  where marco.codigo = 'DEC21261971'
    and marco.eliminado_en is null
    and r.eliminado_en is null;

  if v_requisitos <> 10 then
    raise exception 'Se esperaban 10 requisitos activos del Decreto 2126/1971 y se encontraron %', v_requisitos;
  end if;

  insert into public.requisito_legal_norma (
    requisito_legal_id,
    version_norma_id
  )
  select r.id, v_version_brcgs
  from public.requisitos_legales r
  join public.normas marco on marco.id = r.norma_id
  where marco.codigo = 'DEC21261971'
    and marco.eliminado_en is null
    and r.eliminado_en is null
    and not exists (
      select 1
      from public.requisito_legal_norma existente
      where existente.requisito_legal_id = r.id
        and existente.version_norma_id = v_version_brcgs
        and existente.eliminado_en is null
    );

  select count(*) into v_asociaciones
  from public.requisito_legal_norma rln
  join public.requisitos_legales r on r.id = rln.requisito_legal_id
  join public.normas marco on marco.id = r.norma_id
  where marco.codigo = 'DEC21261971'
    and r.eliminado_en is null
    and rln.version_norma_id = v_version_brcgs
    and rln.eliminado_en is null;

  if v_asociaciones <> 10 then
    raise exception 'La vinculación BRCGS quedó incompleta: % de 10 requisitos asociados', v_asociaciones;
  end if;
end;
$$;
