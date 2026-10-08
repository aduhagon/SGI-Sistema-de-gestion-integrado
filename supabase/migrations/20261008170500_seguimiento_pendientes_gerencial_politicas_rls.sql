-- Politicas explicitas para documentar que la tabla no se opera directo desde clientes.
-- La lectura/escritura del seguimiento gerencial pasa por RPCs con validacion de gestor SGI.
create policy seguimiento_pendientes_gerencial_sin_acceso_directo
  on public.seguimiento_pendientes_gerencial
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
