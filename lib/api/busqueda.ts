import { createClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  codigo: string | null;
  href: string;
};

export type ResultadosAgrupados = {
  documentos: ResultadoBusqueda[];
  requisitos: ResultadoBusqueda[];
  procesos: ResultadoBusqueda[];
  auditorias: ResultadoBusqueda[];
  noConformidades: ResultadoBusqueda[];
  total: number;
};

const VACIO: ResultadosAgrupados = {
  documentos: [],
  requisitos: [],
  procesos: [],
  auditorias: [],
  noConformidades: [],
  total: 0,
};

/**
 * Búsqueda global por texto (ilike) en las entidades principales del SGI.
 * Usa ilike en vez de full-text porque en un SGI se busca tanto por código
 * (A-MP-05, 8.4, AUD-2026) como por texto, y ilike cubre ambos casos.
 */
export async function buscarGlobal(texto: string): Promise<ResultadosAgrupados> {
  const t = texto.trim();
  if (t.length < 2) return VACIO;

  const supabase = createClient();
  const patron = `%${t}%`;
  const LIMITE = 8;

  const [docs, reqs, procs, auds, ncs] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, codigo, titulo, estado_actual")
      .is("eliminado_en", null)
      .or(`codigo.ilike.${patron},titulo.ilike.${patron}`)
      .limit(LIMITE),
    supabase
      .from("requisitos")
      .select(
        `id, clausula, titulo,
         versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
           normas:normas!versiones_norma_norma_id_fkey (codigo)
         )`,
      )
      .eq("activo", true)
      .or(`clausula.ilike.${patron},titulo.ilike.${patron}`)
      .limit(LIMITE),
    supabase
      .from("procesos")
      .select("id, codigo, nombre, tipo")
      .eq("activo", true)
      .is("eliminado_en", null)
      .or(`codigo.ilike.${patron},nombre.ilike.${patron}`)
      .limit(LIMITE),
    supabase
      .from("auditorias")
      .select("id, codigo, titulo, tipo")
      .eq("activo", true)
      .is("eliminado_en", null)
      .or(`codigo.ilike.${patron},titulo.ilike.${patron}`)
      .limit(LIMITE),
    supabase
      .from("no_conformidades")
      .select("id, codigo, titulo, estado")
      .eq("activo", true)
      .is("eliminado_en", null)
      .or(`codigo.ilike.${patron},titulo.ilike.${patron}`)
      .limit(LIMITE),
  ]);

  const documentos: ResultadoBusqueda[] = (docs.data ?? []).map((d: any) => ({
    id: d.id,
    titulo: d.titulo,
    subtitulo: null,
    codigo: d.codigo,
    href: `/documentos/${d.id}`,
  }));

  const requisitos: ResultadoBusqueda[] = (reqs.data ?? []).map((r: any) => ({
    id: r.id,
    titulo: r.titulo,
    subtitulo: r.versiones_norma?.normas?.codigo
      ? `${r.versiones_norma.normas.codigo} · cláusula ${r.clausula}`
      : `Cláusula ${r.clausula}`,
    codigo: r.clausula,
    href: `/cumplimiento`,
  }));

  const procesos: ResultadoBusqueda[] = (procs.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: p.nombre,
    subtitulo: p.tipo,
    codigo: p.codigo,
    href: `/procesos`,
  }));

  const auditorias: ResultadoBusqueda[] = (auds.data ?? []).map((a: any) => ({
    id: a.id,
    titulo: a.titulo,
    subtitulo: a.tipo,
    codigo: a.codigo,
    href: `/auditorias/${a.id}`,
  }));

  const noConformidades: ResultadoBusqueda[] = (ncs.data ?? []).map((n: any) => ({
    id: n.id,
    titulo: n.titulo,
    subtitulo: n.estado,
    codigo: n.codigo,
    href: `/ncs/${n.id}`,
  }));

  return {
    documentos,
    requisitos,
    procesos,
    auditorias,
    noConformidades,
    total:
      documentos.length +
      requisitos.length +
      procesos.length +
      auditorias.length +
      noConformidades.length,
  };
}
