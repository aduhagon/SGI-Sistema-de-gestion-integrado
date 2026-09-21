-- Migracion aplicada en produccion el 2026-09-21.
-- Corrige el resumen semanal y la conciliacion de la cola de correo.
--
-- 1) El job interno consulta fn_pendientes_usuario_fase2 para procesar
--    los pendientes de cada destinatario, sin debilitar la restriccion
--    de fn_pendientes_usuario para usuarios interactivos.
-- 2) El CASE de conciliacion devuelve explicitamente estado_envio_correo.

DO $migration$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_enviar_resumen_semanal'
  ORDER BY p.oid DESC
  LIMIT 1;

  v_def := pg_get_functiondef(v_oid);
  v_new := replace(
    v_def,
    'FROM fn_pendientes_usuario(r_user.id, v_zona) p;',
    'FROM fn_pendientes_usuario_fase2(r_user.id, v_zona) p;'
  );

  IF v_new = v_def THEN
    RAISE EXCEPTION 'No se encontro la llamada esperada en fn_enviar_resumen_semanal';
  END IF;

  EXECUTE v_new;

  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_correo_conciliar'
  ORDER BY p.oid DESC
  LIMIT 1;

  v_def := pg_get_functiondef(v_oid);
  v_new := replace(
    v_def,
    'CASE WHEN r.intentos >= r.max_intentos THEN ''agotado'' ELSE ''fallido'' END',
    'CASE WHEN r.intentos >= r.max_intentos THEN ''agotado''::estado_envio_correo ELSE ''fallido''::estado_envio_correo END'
  );

  IF v_new = v_def THEN
    RAISE EXCEPTION 'No se encontro el CASE esperado en fn_correo_conciliar';
  END IF;

  EXECUTE v_new;
END;
$migration$;
