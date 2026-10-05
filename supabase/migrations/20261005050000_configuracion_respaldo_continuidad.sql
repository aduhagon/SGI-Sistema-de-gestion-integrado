-- Evidencias y umbrales de continuidad configurables desde Superadministracion.

insert into public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
values
  ('backup_ultimo_verificado_fecha', '""'::jsonb, 'continuidad', 'Fecha del último respaldo verificado', true),
  ('backup_periodicidad_dias', '1'::jsonb, 'continuidad', 'Antigüedad máxima esperada del respaldo', true),
  ('backup_alcance', '"base_datos"'::jsonb, 'continuidad', 'Alcance declarado de la evidencia de respaldo', true),
  ('restore_ultima_prueba_fecha', '""'::jsonb, 'continuidad', 'Fecha de la última prueba de restauración', true),
  ('restore_periodicidad_dias', '180'::jsonb, 'continuidad', 'Antigüedad máxima de la prueba de restauración', true),
  ('continuidad_responsable', '""'::jsonb, 'continuidad', 'Responsable técnico de continuidad', true),
  ('continuidad_procedimiento_url', '""'::jsonb, 'continuidad', 'Enlace al procedimiento de respaldo y recuperación', true)
on conflict (clave) do nothing;
