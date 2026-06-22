"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export type EstadoRol =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export type EstadoRolMultiple =
  | { ok: true; creados: number; reactivados: number; yaTenian: number }
  | { ok: false; error: string }
  | null;

const rolMultipleSchema = z.object({
  puestoId: z.string().uuid(),
  procesoIds: z.array(z.string().uuid()).min(1, "Elegí al menos un proceso."),
  rol: z.enum(
    ["responsable_proceso", "elaborador", "aprobador_n1", "aprobador_n2", "lector"],
    { errorMap: () => ({ message: "Elegí un rol." }) },
  ),
  motivo: z.string().min(5, "El motivo es obligatorio (mínimo 5 caracteres)."),
});

// Asigna UN rol a VARIOS procesos de una sola vez, con un motivo común.
// Reutiliza la misma lógica que la versión single: si la combinación existe
// inactiva, la reactiva; si está activa, la cuenta como "ya tenían"; si no
// existe, la inserta. Es tolerante: procesa todos y reporta el resumen.
export async function agregarRolEnProcesosMultiple(
  puestoId: string,
  procesoIds: string[],
  rol: string,
  motivo: string,
): Promise<EstadoRolMultiple> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  const parsed = rolMultipleSchema.safeParse({ puestoId, procesoIds, rol, motivo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { puestoId: pId, procesoIds: procesos, rol: rolOk, motivo: motivoOk } = parsed.data;

  // Estado actual de esas combinaciones (activas o no), en una sola consulta.
  const { data: existentes, error: errLista } = await supabase
    .from("puesto_proceso_rol")
    .select("id, proceso_id, activo")
    .eq("puesto_id", pId)
    .eq("rol_en_proceso", rolOk)
    .in("proceso_id", procesos);

  if (errLista) {
    return { ok: false, error: `No se pudo verificar el estado actual: ${errLista.message}` };
  }

  const porProceso = new Map<string, { id: string; activo: boolean }>();
  for (const e of (existentes ?? []) as any[]) {
    porProceso.set(e.proceso_id, { id: e.id, activo: e.activo });
  }

  const aInsertar: string[] = [];
  const aReactivar: string[] = [];
  let yaTenian = 0;

  for (const procId of procesos) {
    const ex = porProceso.get(procId);
    if (!ex) aInsertar.push(procId);
    else if (ex.activo) yaTenian += 1;
    else aReactivar.push(ex.id);
  }

  // Reactivar las que estaban dadas de baja.
  if (aReactivar.length > 0) {
    const { error } = await supabase
      .from("puesto_proceso_rol")
      .update({
        activo: true,
        eliminado_en: null,
        eliminado_por: null,
        motivo_eliminacion: null,
        motivo_asignacion: motivoOk,
      })
      .in("id", aReactivar);
    if (error) return { ok: false, error: `No se pudo reactivar: ${error.message}` };
  }

  // Insertar las nuevas en lote.
  if (aInsertar.length > 0) {
    const filas = aInsertar.map((procId) => ({
      puesto_id: pId,
      proceso_id: procId,
      rol_en_proceso: rolOk,
      creado_por: usuarioId,
      motivo_asignacion: motivoOk,
    }));
    const { error } = await supabase.from("puesto_proceso_rol").insert(filas);
    if (error) {
      const msg = error.message.includes("row-level security")
        ? "No tenés permisos para asignar roles."
        : `No se pudo asignar: ${error.message}`;
      return { ok: false, error: msg };
    }
  }

  revalidatePath(`/configuracion/puestos/${pId}`);
  return {
    ok: true,
    creados: aInsertar.length,
    reactivados: aReactivar.length,
    yaTenian,
  };
}

export async function quitarRolEnProceso(
  puestoId: string,
  rolId: string,
  motivo: string,
): Promise<EstadoRol> {
  const supabase = createClient();
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };

  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  const { error } = await supabase
    .from("puesto_proceso_rol")
    .update({
      activo: false,
      eliminado_en: new Date().toISOString(),
      eliminado_por: usuarioId,
      motivo_eliminacion: motivo.trim(),
    })
    .eq("id", rolId);

  if (error) return { ok: false, error: `No se pudo quitar: ${error.message}` };

  revalidatePath(`/configuracion/puestos/${puestoId}`);
  return { ok: true };
}
