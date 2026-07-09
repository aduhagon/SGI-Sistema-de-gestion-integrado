"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerContextoLayout } from "@/lib/api/contexto-layout";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

// Guard: solo admin SGI. La RLS de la base también lo exige (defensa en profundidad),
// pero cortamos temprano para dar un mensaje claro.
async function exigirAdmin(): Promise<ResultadoAccion> {
  const { esAdminSgi } = await obtenerContextoLayout();
  if (!esAdminSgi) return { ok: false, error: "Solo un administrador del SGI puede editar los flujogramas." };
  return { ok: true };
}

// (1) Reasignar el proceso del SGI de un nodo-proceso
export async function reasignarProceso(nodoId: string, procesoId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { error } = await sb.from("flujo_nodo")
    .update({ proceso_id: procesoId || null })
    .eq("id", nodoId)
    .eq("nivel", "proceso");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (2) Reasignar el puesto (carril) de un paso
export async function reasignarPuesto(nodoId: string, puestoId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { error } = await sb.from("flujo_nodo")
    .update({ puesto_id: puestoId || null })
    .eq("id", nodoId)
    .eq("nivel", "paso");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (3) Editar campos de un paso
export type EdicionPaso = {
  titulo?: string;
  tipoBpmn?: "inicio" | "tarea" | "decision" | "fin" | "subproceso_ref";
  marcador?: "user" | "service" | "manual" | "sin_marcador";
  codRiesgo?: string | null;
  normativa?: string | null;
};

export async function editarPaso(nodoId: string, cambios: EdicionPaso): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const patch: Record<string, unknown> = {};
  if (cambios.titulo !== undefined) patch.titulo = cambios.titulo.trim() || "(sin título)";
  if (cambios.tipoBpmn !== undefined) patch.tipo_bpmn = cambios.tipoBpmn;
  if (cambios.marcador !== undefined) patch.marcador = cambios.marcador;
  if (cambios.codRiesgo !== undefined) patch.cod_riesgo = cambios.codRiesgo?.trim() || null;
  if (cambios.normativa !== undefined) patch.normativa = cambios.normativa?.trim() || null;
  if (Object.keys(patch).length === 0) return { ok: true };
  const sb = createClient();
  const { error } = await sb.from("flujo_nodo").update(patch).eq("id", nodoId).eq("nivel", "paso");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (4) Corregir la secuencia: cambiar el destino de una arista existente
export async function cambiarDestinoArista(aristaId: string, nuevoDestinoId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  // Traigo la arista para no permitir self-loop (el CHECK de la base también lo impide)
  const { data: ar, error: e1 } = await sb.from("flujo_arista").select("origen_id").eq("id", aristaId).single();
  if (e1) return { ok: false, error: e1.message };
  if (ar && (ar as { origen_id: string }).origen_id === nuevoDestinoId) {
    return { ok: false, error: "Un paso no puede conectarse consigo mismo." };
  }
  const { error } = await sb.from("flujo_arista").update({ destino_id: nuevoDestinoId }).eq("id", aristaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (4b) Crear una arista de secuencia entre dos pasos
export async function crearArista(origenId: string, destinoId: string, etiqueta?: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  if (origenId === destinoId) return { ok: false, error: "Un paso no puede conectarse consigo mismo." };
  const sb = createClient();
  const { error } = await sb.from("flujo_arista").insert({
    origen_id: origenId,
    destino_id: destinoId,
    tipo: etiqueta ? "rama" : "secuencia",
    etiqueta: etiqueta?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (4c) Eliminar una arista
export async function eliminarArista(aristaId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { error } = await sb.from("flujo_arista").delete().eq("id", aristaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}
