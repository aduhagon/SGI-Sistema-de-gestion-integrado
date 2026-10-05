-- Valores operativos que el superadministrador puede ajustar sin publicar código.
-- Los ceros preservan el comportamiento histórico: no generar fechas automáticas.

insert into public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
values
  ('aprobacion_plazo_dias_default', '0'::jsonb, 'operacion', 'Plazo predeterminado para nuevas aprobaciones; 0 no asigna fecha', true),
  ('nc_plazo_cierre_dias_default', '0'::jsonb, 'operacion', 'Plazo predeterminado para nuevas no conformidades; 0 no asigna fecha', true),
  ('requisitos_alerta_dias', '30'::jsonb, 'operacion', 'Anticipación para mostrar próximas evaluaciones legales', true)
on conflict (clave) do nothing;
