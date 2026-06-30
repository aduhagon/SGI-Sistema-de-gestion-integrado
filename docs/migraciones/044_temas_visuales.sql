-- 044_temas_visuales
-- APLICADA en producción vía Supabase MCP (proyecto hghzpuvxggvpgwzpzaqw).
-- Archivada acá para el historial del repo. NO re-ejecutar.
--
-- Temas visuales del SGI: paleta + tipografía + forma, parametrizables por el admin.
-- El tema "Default" de fábrica vive en código (lib/tema/default.ts), NO en esta tabla.

CREATE TABLE public.temas_visuales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  tokens          jsonb NOT NULL,
  creado_por      uuid REFERENCES public.usuarios(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid REFERENCES public.usuarios(id),
  CONSTRAINT temas_visuales_nombre_no_vacio CHECK (length(trim(nombre)) > 0)
);

COMMENT ON TABLE public.temas_visuales IS
  'Temas visuales creados por el usuario (color/tipografía/forma). El tema Default de fábrica vive en código.';

ALTER TABLE public.temas_visuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY temas_visuales_select_authenticated
  ON public.temas_visuales FOR SELECT TO authenticated USING (true);

CREATE POLICY temas_visuales_insert_admin
  ON public.temas_visuales FOR INSERT TO authenticated
  WITH CHECK ((SELECT fn_usuario_es_admin()));

CREATE POLICY temas_visuales_update_admin
  ON public.temas_visuales FOR UPDATE TO authenticated
  USING ((SELECT fn_usuario_es_admin()))
  WITH CHECK ((SELECT fn_usuario_es_admin()));

CREATE POLICY temas_visuales_delete_admin
  ON public.temas_visuales FOR DELETE TO authenticated
  USING ((SELECT fn_usuario_es_admin()));

INSERT INTO public.configuracion_sistema (clave, valor, categoria, descripcion, editable)
VALUES (
  'tema_activo_id',
  'null'::jsonb,
  'apariencia',
  'ID del tema visual activo en temas_visuales; null usa el tema Default de fábrica.',
  true
)
ON CONFLICT (clave) DO NOTHING;
