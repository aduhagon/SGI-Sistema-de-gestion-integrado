import {
  obtenerAprobacionesPendientesAdmin,
  type AprobacionAdmin,
} from "@/lib/api/aprobacionesAdmin";

/**
 * Vistas agrupadas de aprobaciones pendientes, análogas a las de acuses.
 * Se construyen en memoria a partir de fn_aprobaciones_pendientes_admin(), que
 * ya entrega proceso y aprobador por fila — no hace falta lógica SQL nueva.
 *
 *  - por proceso: cuántas aprobaciones pendientes tiene cada proceso.
 *  - por usuario: cuántas tiene cada aprobador asignado, con su detalle.
 */

export type AprobacionesGrupo = {
  id: string | null;
  etiqueta: string;
  codigo?: string | null;
  total: number;
  vencidas: number;
  nivel1: number;
  nivel2: number;
};

export type AprobacionItem = {
  aprobacionId: string;
  documentoId: string;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  procesoNombre: string | null;
  nivelPendiente: number;
  vencida: boolean;
  diasEsperando: number;
};

export type UsuarioConAprobaciones = {
  usuarioId: string | null;
  nombre: string;
  total: number;
  vencidas: number;
  aprobaciones: AprobacionItem[];
};

function aItem(a: AprobacionAdmin): AprobacionItem {
  return {
    aprobacionId: a.aprobacionId,
    documentoId: a.documentoId,
    codigo: a.codigo,
    titulo: a.titulo,
    numeroVersion: a.numeroVersion,
    procesoNombre: a.procesoNombre,
    nivelPendiente: a.nivelPendiente,
    vencida: a.vencida,
    diasEsperando: a.diasEsperando,
  };
}

/** Aprobaciones pendientes agrupadas por proceso del documento. */
export async function obtenerAprobacionesPorProceso(): Promise<AprobacionesGrupo[]> {
  const filas = await obtenerAprobacionesPendientesAdmin();

  const mapa = new Map<string, AprobacionesGrupo>();
  for (const a of filas) {
    // Clave por código de proceso; los sin proceso van a un grupo aparte.
    const clave = a.procesoCodigo ?? "__sin_proceso__";
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        id: a.procesoCodigo,
        etiqueta: a.procesoNombre ?? "Sin proceso asignado",
        codigo: a.procesoCodigo,
        total: 0,
        vencidas: 0,
        nivel1: 0,
        nivel2: 0,
      });
    }
    const g = mapa.get(clave)!;
    g.total += 1;
    if (a.vencida) g.vencidas += 1;
    if (a.nivelPendiente === 1) g.nivel1 += 1;
    else if (a.nivelPendiente === 2) g.nivel2 += 1;
  }

  return Array.from(mapa.values()).sort(
    (a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, "es"),
  );
}

/** Aprobaciones pendientes agrupadas por aprobador asignado. */
export async function obtenerAprobacionesPorUsuario(): Promise<UsuarioConAprobaciones[]> {
  const filas = await obtenerAprobacionesPendientesAdmin();

  const mapa = new Map<string, UsuarioConAprobaciones>();
  for (const a of filas) {
    const clave = a.aprobadorId ?? "__sin_aprobador__";
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        usuarioId: a.aprobadorId,
        nombre: a.aprobadorNombre ?? "Sin aprobador asignado",
        total: 0,
        vencidas: 0,
        aprobaciones: [],
      });
    }
    const u = mapa.get(clave)!;
    u.total += 1;
    if (a.vencida) u.vencidas += 1;
    u.aprobaciones.push(aItem(a));
  }

  // Ordenar usuarios por cantidad de pendientes; dentro, primero las vencidas.
  const grupos = Array.from(mapa.values());
  for (const u of grupos) {
    u.aprobaciones.sort(
      (a, b) =>
        Number(b.vencida) - Number(a.vencida) || b.diasEsperando - a.diasEsperando,
    );
  }
  return grupos.sort(
    (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"),
  );
}
