-- Gobierno de integraciones: responsable y próximas rotaciones.
-- Nunca se almacenan aquí claves, tokens ni secretos.

insert into public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
values
  ('integraciones_responsable', '""'::jsonb, 'integraciones', 'Responsable técnico de las integraciones', true),
  ('supabase_rotacion_fecha', '""'::jsonb, 'integraciones', 'Próxima revisión o rotación de credenciales Supabase', true),
  ('vercel_rotacion_fecha', '""'::jsonb, 'integraciones', 'Próxima revisión o rotación de credenciales Vercel', true),
  ('correo_rotacion_fecha', '""'::jsonb, 'integraciones', 'Próxima revisión o rotación de credenciales de correo', true),
  ('monitoreo_rotacion_fecha', '""'::jsonb, 'integraciones', 'Próxima revisión o rotación de credenciales de monitoreo', true)
on conflict (clave) do nothing;
