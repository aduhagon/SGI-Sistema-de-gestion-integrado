import { createClient } from "@/lib/supabase/server";
import { TEMA_DEFAULT, NOMBRE_DEFAULT, type TemaTokens } from "@/lib/tema/default";
import { temaTokensSchema } from "@/lib/schemas/apariencia";

export type TemaVisual = {
  id: string; // "default" para el tema de fábrica; uuid para los de usuario
  nombre: string;
  sistema: boolean; // true solo para Default
  tokens: TemaTokens;
};

/** El tema de fábrica como TemaVisual, para mostrarlo junto a los de usuario. */
export function temaDefault(): TemaVisual {
  return { id: "default", nombre: NOMBRE_DEFAULT, sistema: true, tokens: TEMA_DEFAULT };
}

/** Parsea tokens crudos de la DB; si están corruptos, cae al Default. */
function parseTokens(raw: unknown): TemaTokens {
  const r = temaTokensSchema.safeParse(raw);
  return r.success ? r.data : TEMA_DEFAULT;
}

/** Lista los temas de usuario (sin el Default), ordenados por nombre. */
export async function listarTemasUsuario(): Promise<TemaVisual[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("temas_visuales")
    .select("id, nombre, tokens")
    .order("nombre");
  if (error || !data) return [];
  return (data as { id: string; nombre: string; tokens: unknown }[]).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    sistema: false,
    tokens: parseTokens(t.tokens),
  }));
}

/** Default primero, después los de usuario. Es lo que consume el panel. */
export async function listarTemas(): Promise<TemaVisual[]> {
  return [temaDefault(), ...(await listarTemasUsuario())];
}

/** Lee el puntero `tema_activo_id`. null => Default de fábrica. */
export async function obtenerTemaActivoId(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion_sistema")
    .select("valor")
    .eq("clave", "tema_activo_id")
    .maybeSingle();
  if (error || !data) return null;
  const v = data.valor;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Resuelve el tema que debe aplicarse al SGI ahora. Si el puntero es null, o
 * apunta a un tema borrado, cae al Default de fábrica.
 */
export async function resolverTemaActivo(): Promise<TemaVisual> {
  const activoId = await obtenerTemaActivoId();
  if (!activoId) return temaDefault();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("temas_visuales")
    .select("id, nombre, tokens")
    .eq("id", activoId)
    .maybeSingle();
  if (error || !data) return temaDefault();

  return {
    id: data.id as string,
    nombre: data.nombre as string,
    sistema: false,
    tokens: parseTokens(data.tokens),
  };
}
