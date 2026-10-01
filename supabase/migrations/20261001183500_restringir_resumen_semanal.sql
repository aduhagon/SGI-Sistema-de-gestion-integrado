-- El resumen semanal es una tarea interna. No debe poder invocarse desde
-- clientes anonimos ni desde sesiones autenticadas mediante la Data API.

revoke all on function public.fn_enviar_resumen_semanal()
  from public, anon, authenticated;

grant execute on function public.fn_enviar_resumen_semanal()
  to service_role;
