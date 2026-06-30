"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { temaTokensSchema, nombreTemaSchema } from "@/lib/schemas/apariencia";
import { TEMA_DEFAULT } from "@/lib/tema/default";

export type EstadoApariencia =
  | { ok: true; id?: string }
  | { ok: false; error: string; campo?: string }
  | null;

function traducir(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "No tenés permisos para administrar temas.";
  }
  if (m.includes("temas_visuales_nombre_no_vacio")) {
    return "El nombre no puede estar vacío.";
  }
  return "No se pudo completar la operación.";
}

function revalidar() {
  revalidatePath("/configuracion/apariencia");
  // El tema activo afecta el layout completo: revalidamos la raíz.
  revalidatePath("/", "layout");
}

/**
 * Crea un tema nuevo. Los tokens vienen serializados en el form como JSON
 * (campo "tokens"). El nombre se valida contra la palabra reservada "Default".
 */
export async function crearTema(
  _prev: EstadoApariencia,
  formData: FormData,
): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const nombreParsed = nombreTemaSchema.safeParse(formData.get("nombre"));
  if (!nombreParsed.success) {
    return { ok: false, error: nombreParsed.error.issues[0].message, campo: "nombre" };
  }

  let tokensRaw: unknown;
  try {
    tokensRaw = JSON.parse(String(formData.get("tokens") ?? "{}"));
  } catch {
    return { ok: false, error: "Tokens del tema mal formados." };
  }
  const tokensParsed = temaTokensSchema.safeParse(tokensRaw);
  if (!tokensParsed.success) {
    return { ok: false, error: "Hay valores de tema inválidos.", campo: "tokens" };
  }

  const { data, error } = await supabase
    .from("temas_visuales")
    .insert({
      nombre: nombreParsed.data,
      tokens: tokensParsed.data,
      creado_por: usuarioId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: traducir(error.message) };

  revalidar();
  return { ok: true, id: data.id as string };
}

/**
 * Guarda cambios sobre un tema existente (color/tipo/forma + nombre).
 * Default no se puede editar: no existe en la tabla, así que cualquier id
 * "default" se rechaza acá.
 */
export async function actualizarTema(
  _prev: EstadoApariencia,
  formData: FormData,
): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const id = String(formData.get("id") ?? "");
  if (!id || id === "default") {
    return { ok: false, error: "El tema Default es de solo lectura." };
  }

  const nombreParsed = nombreTemaSchema.safeParse(formData.get("nombre"));
  if (!nombreParsed.success) {
    return { ok: false, error: nombreParsed.error.issues[0].message, campo: "nombre" };
  }

  let tokensRaw: unknown;
  try {
    tokensRaw = JSON.parse(String(formData.get("tokens") ?? "{}"));
  } catch {
    return { ok: false, error: "Tokens del tema mal formados." };
  }
  const tokensParsed = temaTokensSchema.safeParse(tokensRaw);
  if (!tokensParsed.success) {
    return { ok: false, error: "Hay valores de tema inválidos.", campo: "tokens" };
  }

  const { error } = await supabase
    .from("temas_visuales")
    .update({
      nombre: nombreParsed.data,
      tokens: tokensParsed.data,
      actualizado_en: new Date().toISOString(),
      actualizado_por: usuarioId,
    })
    .eq("id", id);
  if (error) return { ok: false, error: traducir(error.message) };

  revalidar();
  return { ok: true, id };
}

/** Renombra un tema sin tocar sus tokens. */
export async function renombrarTema(id: string, nombre: string): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };
  if (!id || id === "default") {
    return { ok: false, error: "El tema Default es de solo lectura." };
  }

  const parsed = nombreTemaSchema.safeParse(nombre);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("temas_visuales")
    .update({
      nombre: parsed.data,
      actualizado_en: new Date().toISOString(),
      actualizado_por: usuarioId,
    })
    .eq("id", id);
  if (error) return { ok: false, error: traducir(error.message) };

  revalidar();
  return { ok: true, id };
}

/**
 * Duplica un tema. Acepta el id "default": en ese caso clona los tokens de
 * fábrica desde código (no hay fila que copiar).
 */
export async function duplicarTema(id: string, nombreOrigen: string): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  let tokens: unknown;
  if (id === "default") {
    tokens = TEMA_DEFAULT;
  } else {
    const { data, error } = await supabase
      .from("temas_visuales")
      .select("tokens")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "No se encontró el tema a duplicar." };
    tokens = data.tokens;
  }

  const tokensParsed = temaTokensSchema.safeParse(tokens);
  if (!tokensParsed.success) return { ok: false, error: "El tema origen tiene valores inválidos." };

  const nombreCopia = `${nombreOrigen} (copia)`.slice(0, 60);
  const { data, error } = await supabase
    .from("temas_visuales")
    .insert({ nombre: nombreCopia, tokens: tokensParsed.data, creado_por: usuarioId })
    .select("id")
    .single();
  if (error) return { ok: false, error: traducir(error.message) };

  revalidar();
  return { ok: true, id: data.id as string };
}

/**
 * Elimina un tema. Si era el activo, el puntero queda apuntando a un id que ya
 * no existe; resolverTemaActivo() cae al Default igual, pero por prolijidad
 * reseteamos el puntero a null.
 */
export async function eliminarTema(id: string): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };
  if (!id || id === "default") {
    return { ok: false, error: "El tema Default no se puede eliminar." };
  }

  // ¿es el activo? lo leemos antes de borrar
  const { data: ptr } = await supabase
    .from("configuracion_sistema")
    .select("valor")
    .eq("clave", "tema_activo_id")
    .maybeSingle();
  const eraActivo = typeof ptr?.valor === "string" && ptr.valor === id;

  const { error } = await supabase.from("temas_visuales").delete().eq("id", id);
  if (error) return { ok: false, error: traducir(error.message) };

  if (eraActivo) {
    // Resetear a Default vía el RPC existente (valida admin en DB).
    await supabase.rpc("fn_set_configuracion", { p_clave: "tema_activo_id", p_valor: null });
  }

  revalidar();
  return { ok: true };
}

/**
 * Aplica un tema a todo el SGI (selector global). Pasar "default" para volver
 * al tema de fábrica. Usa el RPC existente fn_set_configuracion, que valida
 * superadmin en la base.
 */
export async function aplicarTema(id: string): Promise<EstadoApariencia> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  // null en el puntero = Default de fábrica.
  const valor = id === "default" ? null : id;

  const { data, error } = await supabase.rpc("fn_set_configuracion", {
    p_clave: "tema_activo_id",
    p_valor: valor,
  });
  if (error) return { ok: false, error: traducir(error.message) };
  const fila = Array.isArray(data) ? data[0] : data;
  if (fila && fila.ok === false) {
    return { ok: false, error: fila.mensaje ?? "No se pudo aplicar el tema." };
  }

  revalidar();
  return { ok: true, id };
}
