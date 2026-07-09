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

// ═══════════════════════════════════════════════════════════════
// paquete-065 · Alta/baja de pasos + CRUD de data objects
// ═══════════════════════════════════════════════════════════════

// (5) Crear un paso nuevo, suelto (sin conexiones). Se conecta luego a mano.
export async function crearPaso(
  subprocesoId: string,
  datos: { titulo: string; tipoBpmn?: "inicio" | "tarea" | "decision" | "fin"; puestoId?: string | null }
): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();

  // orden = max(orden hermanos) + 1
  const { data: hermanos } = await sb
    .from("flujo_nodo")
    .select("orden")
    .eq("padre_id", subprocesoId)
    .eq("nivel", "paso")
    .order("orden", { ascending: false })
    .limit(1);
  const nuevoOrden = hermanos && hermanos.length > 0 ? ((hermanos[0] as { orden: number }).orden ?? 0) + 1 : 1;

  const { error } = await sb.from("flujo_nodo").insert({
    nivel: "paso",
    padre_id: subprocesoId,
    titulo: datos.titulo.trim() || "(nuevo paso)",
    tipo_bpmn: datos.tipoBpmn ?? "tarea",
    puesto_id: datos.puestoId || null,
    orden: nuevoOrden,
    activo: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (6) Borrar un paso "cosiendo" el hueco: conecta cada origen entrante con cada destino saliente.
export async function borrarPasoCosiendo(nodoId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();

  // aristas entrantes y salientes del paso a borrar
  const [{ data: entrantes }, { data: salientes }] = await Promise.all([
    sb.from("flujo_arista").select("id,origen_id,tipo,etiqueta").eq("destino_id", nodoId),
    sb.from("flujo_arista").select("id,destino_id").eq("origen_id", nodoId),
  ]);

  // coser: por cada (origen → nodo) y (nodo → destino), crear (origen → destino)
  const nuevas: { origen_id: string; destino_id: string; tipo: string; etiqueta: string | null }[] = [];
  for (const e of (entrantes ?? []) as { origen_id: string; tipo: string; etiqueta: string | null }[]) {
    for (const s of (salientes ?? []) as { destino_id: string }[]) {
      if (e.origen_id !== s.destino_id) {
        nuevas.push({ origen_id: e.origen_id, destino_id: s.destino_id, tipo: e.tipo, etiqueta: e.etiqueta });
      }
    }
  }
  if (nuevas.length > 0) {
    const { error: eIns } = await sb.from("flujo_arista").insert(nuevas);
    if (eIns) return { ok: false, error: "No se pudo coser el flujo: " + eIns.message };
  }

  // borrar el nodo (CASCADE limpia sus aristas y data objects)
  const { error } = await sb.from("flujo_nodo").delete().eq("id", nodoId).eq("nivel", "paso");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (7) Data objects: crear
export async function crearDataObject(
  nodoId: string,
  direccion: "entrada" | "salida",
  etiqueta: string,
  documentoId?: string | null
): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  if (!etiqueta.trim()) return { ok: false, error: "La etiqueta no puede estar vacía." };
  const sb = createClient();
  const { error } = await sb.from("flujo_data_object").insert({
    nodo_id: nodoId,
    direccion,
    etiqueta: etiqueta.trim(),
    documento_id: documentoId || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (8) Data objects: editar (etiqueta y/o vínculo documental)
export async function editarDataObject(
  id: string,
  cambios: { etiqueta?: string; documentoId?: string | null }
): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const patch: Record<string, unknown> = {};
  if (cambios.etiqueta !== undefined) {
    if (!cambios.etiqueta.trim()) return { ok: false, error: "La etiqueta no puede estar vacía." };
    patch.etiqueta = cambios.etiqueta.trim();
  }
  if (cambios.documentoId !== undefined) patch.documento_id = cambios.documentoId || null;
  if (Object.keys(patch).length === 0) return { ok: true };
  const sb = createClient();
  const { error } = await sb.from("flujo_data_object").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (9) Data objects: eliminar
export async function eliminarDataObject(id: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { error } = await sb.from("flujo_data_object").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
// paquete-066 · Aristas entrantes + insertar entre dos
// ═══════════════════════════════════════════════════════════════

// (10) Cambiar el ORIGEN de una arista (simétrico a cambiarDestinoArista)
export async function cambiarOrigenArista(aristaId: string, nuevoOrigenId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { data: ar, error: e1 } = await sb.from("flujo_arista").select("destino_id").eq("id", aristaId).single();
  if (e1) return { ok: false, error: e1.message };
  if (ar && (ar as { destino_id: string }).destino_id === nuevoOrigenId) {
    return { ok: false, error: "Un paso no puede conectarse consigo mismo." };
  }
  const { error } = await sb.from("flujo_arista").update({ origen_id: nuevoOrigenId }).eq("id", aristaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (11) Crear una arista entrante hacia este paso (desde un origen elegido)
export async function crearAristaEntrante(destinoId: string, origenId: string, etiqueta?: string): Promise<ResultadoAccion> {
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

// (12) Insertar un paso EXISTENTE entre dos pasos consecutivos A→B.
// Corta la arista A→B (o todas las A→B si hay varias), y crea A→nuevo y nuevo→B.
export async function insertarPasoEntre(
  pasoId: string, origenId: string, destinoId: string
): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  if (pasoId === origenId || pasoId === destinoId) {
    return { ok: false, error: "El paso a insertar no puede ser el origen ni el destino." };
  }
  const sb = createClient();

  // 1) borrar la(s) arista(s) directa(s) origen→destino
  const { error: eDel } = await sb.from("flujo_arista")
    .delete().eq("origen_id", origenId).eq("destino_id", destinoId);
  if (eDel) return { ok: false, error: eDel.message };

  // 2) crear origen→paso y paso→destino
  const { error: eIns } = await sb.from("flujo_arista").insert([
    { origen_id: origenId, destino_id: pasoId, tipo: "secuencia" },
    { origen_id: pasoId, destino_id: destinoId, tipo: "secuencia" },
  ]);
  if (eIns) return { ok: false, error: eIns.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
// paquete-067 · Subtipo de evento + gateway automático
// ═══════════════════════════════════════════════════════════════

// (13) Clasificar un evento (inicio/fin) según nomenclatura BPMN
export async function editarSubtipoEvento(
  nodoId: string,
  subtipo: "ninguno" | "mensaje" | "temporizador" | "senial" | "condicional" | "error" | "terminacion"
): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { error } = await sb.from("flujo_nodo").update({ subtipo_evento: subtipo }).eq("id", nodoId).eq("nivel", "paso");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (14) Insertar un gateway (decision) entre una tarea y sus múltiples destinos.
// Toma las salidas actuales de la tarea, crea un nodo 'decision', reconecta:
//   tarea → gateway, y gateway → cada destino (preservando etiquetas).
export async function insertarGatewayEnSalidas(tareaId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();

  // datos de la tarea (para heredar padre y puesto)
  const { data: tarea, error: eT } = await sb.from("flujo_nodo")
    .select("padre_id,puesto_id,orden,titulo").eq("id", tareaId).single();
  if (eT || !tarea) return { ok: false, error: eT?.message ?? "Tarea no encontrada." };
  const t = tarea as { padre_id: string; puesto_id: string | null; orden: number; titulo: string };

  // salidas actuales de la tarea
  const { data: salidas, error: eS } = await sb.from("flujo_arista")
    .select("id,destino_id,etiqueta,tipo").eq("origen_id", tareaId);
  if (eS) return { ok: false, error: eS.message };
  if (!salidas || salidas.length < 2) {
    return { ok: false, error: "La tarea no tiene múltiples salidas; no hace falta gateway." };
  }

  // 1) crear el gateway (decision)
  const { data: gw, error: eG } = await sb.from("flujo_nodo").insert({
    nivel: "paso",
    padre_id: t.padre_id,
    titulo: "¿?",
    tipo_bpmn: "decision",
    marcador: "sin_marcador",
    puesto_id: t.puesto_id,
    orden: t.orden,
    activo: true,
  }).select("id").single();
  if (eG || !gw) return { ok: false, error: eG?.message ?? "No se pudo crear el gateway." };
  const gwId = (gw as { id: string }).id;

  // 2) reconectar: borrar salidas de la tarea, crear tarea→gateway y gateway→cada destino
  const sal = salidas as { id: string; destino_id: string; etiqueta: string | null; tipo: string }[];
  const { error: eDel } = await sb.from("flujo_arista").delete().eq("origen_id", tareaId);
  if (eDel) return { ok: false, error: eDel.message };

  const nuevas = [
    { origen_id: tareaId, destino_id: gwId, tipo: "secuencia", etiqueta: null as string | null },
    ...sal.map((s) => ({ origen_id: gwId, destino_id: s.destino_id, tipo: "rama", etiqueta: s.etiqueta })),
  ];
  const { error: eIns } = await sb.from("flujo_arista").insert(nuevas);
  if (eIns) return { ok: false, error: eIns.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
// paquete-069 · Reordenar pasos + limpiar aristas duplicadas
// ═══════════════════════════════════════════════════════════════

// (15) Cambiar el orden de un paso (mover izquierda/derecha en el swimlane).
// direccion: -1 = antes, +1 = después. Intercambia el orden con el vecino.
export async function moverPaso(nodoId: string, direccion: -1 | 1): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();

  const { data: paso, error: eP } = await sb.from("flujo_nodo")
    .select("id,padre_id,orden").eq("id", nodoId).single();
  if (eP || !paso) return { ok: false, error: eP?.message ?? "Paso no encontrado." };
  const p = paso as { id: string; padre_id: string; orden: number };

  // hermanos ordenados
  const { data: hermanos, error: eH } = await sb.from("flujo_nodo")
    .select("id,orden").eq("padre_id", p.padre_id).eq("nivel", "paso").order("orden", { ascending: true });
  if (eH) return { ok: false, error: eH.message };
  const lista = (hermanos ?? []) as { id: string; orden: number }[];
  const i = lista.findIndex((h) => h.id === nodoId);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: false, error: "No se puede mover más allá del límite." };

  // intercambiar orden con el vecino
  const vecino = lista[j];
  const { error: e1 } = await sb.from("flujo_nodo").update({ orden: vecino.orden }).eq("id", p.id);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await sb.from("flujo_nodo").update({ orden: p.orden }).eq("id", vecino.id);
  if (e2) return { ok: false, error: e2.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (16) Fijar el orden exacto de un paso (posición numérica), reacomodando el resto.
export async function fijarOrdenPaso(nodoId: string, nuevaPos: number): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { data: paso, error: eP } = await sb.from("flujo_nodo").select("padre_id").eq("id", nodoId).single();
  if (eP || !paso) return { ok: false, error: eP?.message ?? "Paso no encontrado." };
  const padreId = (paso as { padre_id: string }).padre_id;

  const { data: hermanos } = await sb.from("flujo_nodo")
    .select("id").eq("padre_id", padreId).eq("nivel", "paso").order("orden", { ascending: true });
  const lista = (hermanos ?? []).map((h: { id: string }) => h.id);
  const sinEste = lista.filter((id: string) => id !== nodoId);
  const pos = Math.max(0, Math.min(nuevaPos, sinEste.length));
  sinEste.splice(pos, 0, nodoId);

  // reasignar orden 1..N
  for (let k = 0; k < sinEste.length; k++) {
    const { error } = await sb.from("flujo_nodo").update({ orden: k + 1 }).eq("id", sinEste[k]);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/flujogramas");
  return { ok: true };
}

// (17) Limpiar aristas duplicadas de un paso (deja una por cada destino).
export async function limpiarAristasDuplicadas(nodoId: string): Promise<ResultadoAccion> {
  const g = await exigirAdmin();
  if (!g.ok) return g;
  const sb = createClient();
  const { data: aristas, error } = await sb.from("flujo_arista")
    .select("id,destino_id,etiqueta").eq("origen_id", nodoId).order("id", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const vistos = new Set<string>();
  const aBorrar: string[] = [];
  for (const a of (aristas ?? []) as { id: string; destino_id: string; etiqueta: string | null }[]) {
    const clave = a.destino_id + "|" + (a.etiqueta ?? "");
    if (vistos.has(clave)) aBorrar.push(a.id);
    else vistos.add(clave);
  }
  if (aBorrar.length === 0) return { ok: true };
  const { error: eDel } = await sb.from("flujo_arista").delete().in("id", aBorrar);
  if (eDel) return { ok: false, error: eDel.message };
  revalidatePath("/flujogramas");
  return { ok: true };
}
