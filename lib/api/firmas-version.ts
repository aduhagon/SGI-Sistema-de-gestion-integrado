import { createClient } from "@/lib/supabase/server";

/**
 * Circuito de aprobación (libro de firmas) de una versión documental.
 *
 * Fuente de verdad: `decisiones_aprobacion`, no `aprobaciones`.
 * Esa tabla es el registro inmutable de cada firma e incluye la evidencia
 * (hash del documento firmado, IP, método de autenticación), que es lo que
 * un auditor necesita ver. `aprobaciones` sólo guarda el estado consolidado.
 *
 * Puesto del firmante: se resuelve al MOMENTO DE LA FIRMA, no el puesto actual.
 * `persona_puesto` es historizada (vigente_desde / vigente_hasta). Si una
 * persona cambia de puesto después de firmar, la evidencia no debe mutar.
 * Una persona puede tener más de un puesto vigente a esa fecha: se muestran
 * todos (decisión explícita — fidelidad por sobre prolijidad).
 */

export type PuestoHistorico = {
  puesto: string;
  area: string | null;
};

export type FirmaVersion = {
  id: string;
  nivel: number;
  /** Etiqueta funcional derivada del nivel: 1 = Revisor, 2 = Aprobador. */
  rol: string;
  decision: string;
  aprobado: boolean;
  fecha: string;
  comentario: string | null;
  persona: string;
  username: string | null;
  puestos: PuestoHistorico[];
  metodoAutenticacion: string | null;
  hashFirmado: string | null;
  ipOrigen: string | null;
};

/** Nivel numérico -> etiqueta funcional que ve el usuario. */
function rolDeNivel(nivel: number): string {
  if (nivel === 1) return "Revisor";
  if (nivel === 2) return "Aprobador";
  return `Nivel ${nivel}`;
}

type DecisionRow = {
  id: string;
  nivel: number;
  decision: string;
  comentario: string | null;
  timestamp_decision: string;
  metodo_autenticacion: string | null;
  hash_documento_firmado: string | null;
  ip_origen: string | null;
  usuario: {
    username: string | null;
    persona: {
      id: string;
      nombre: string | null;
      apellido: string | null;
    } | null;
  } | null;
};

type PuestoRow = {
  persona_id: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  puesto: { nombre: string | null; area: { nombre: string | null } | null } | null;
};

/**
 * Devuelve las firmas de una versión, ordenadas por nivel.
 * Array vacío si la versión todavía no tiene decisiones registradas.
 */
export async function obtenerFirmasDeVersion(
  versionId: string,
): Promise<FirmaVersion[]> {
  const supabase = createClient();

  const { data: decisionesRaw, error } = await supabase
    .from("decisiones_aprobacion")
    .select(
      `
      id,
      nivel,
      decision,
      comentario,
      timestamp_decision,
      metodo_autenticacion,
      hash_documento_firmado,
      ip_origen,
      usuario:usuarios!decisiones_aprobacion_usuario_id_fkey (
        username,
        persona:personas!usuarios_persona_id_fkey (id, nombre, apellido)
      )
      `,
    )
    .eq("version_id", versionId)
    .order("nivel", { ascending: true })
    .order("timestamp_decision", { ascending: true });

  if (error || !decisionesRaw || decisionesRaw.length === 0) return [];

  const decisiones = decisionesRaw as unknown as DecisionRow[];

  // Segunda consulta para los puestos. No se hace como join anidado porque
  // el filtro temporal depende del timestamp de cada firma y PostgREST no
  // permite expresar esa correlación; se resuelve en memoria (mismo patrón
  // que `listarPuestos`).
  const personaIds = Array.from(
    new Set(
      decisiones
        .map((d) => d.usuario?.persona?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let puestosRows: PuestoRow[] = [];
  if (personaIds.length > 0) {
    const { data: pRaw } = await supabase
      .from("persona_puesto")
      .select(
        `
        persona_id,
        vigente_desde,
        vigente_hasta,
        puesto:puestos!persona_puesto_puesto_id_fkey (
          nombre,
          area:areas!puestos_area_id_fkey (nombre)
        )
        `,
      )
      .in("persona_id", personaIds);
    puestosRows = (pRaw ?? []) as unknown as PuestoRow[];
  }

  return decisiones.map((d) => {
    const personaId = d.usuario?.persona?.id ?? null;
    const firmadoEn = new Date(d.timestamp_decision).getTime();

    // Puestos vigentes EN EL MOMENTO DE LA FIRMA (no los actuales).
    const puestos: PuestoHistorico[] = puestosRows
      .filter((pp) => {
        if (pp.persona_id !== personaId) return false;
        const desde = new Date(pp.vigente_desde).getTime();
        if (desde > firmadoEn) return false;
        if (pp.vigente_hasta === null) return true;
        return new Date(pp.vigente_hasta).getTime() > firmadoEn;
      })
      .sort(
        (a, b) =>
          new Date(a.vigente_desde).getTime() - new Date(b.vigente_desde).getTime(),
      )
      .map((pp) => ({
        puesto: pp.puesto?.nombre ?? "—",
        area: pp.puesto?.area?.nombre ?? null,
      }));

    const nombre = [d.usuario?.persona?.nombre, d.usuario?.persona?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();

    const comentario = d.comentario?.trim() ? d.comentario.trim() : null;

    return {
      id: d.id,
      nivel: d.nivel,
      rol: rolDeNivel(d.nivel),
      decision: d.decision,
      aprobado: d.decision === "aprobado",
      fecha: d.timestamp_decision,
      comentario,
      persona: nombre || d.usuario?.username || "Usuario no disponible",
      username: d.usuario?.username ?? null,
      puestos,
      metodoAutenticacion: d.metodo_autenticacion,
      hashFirmado: d.hash_documento_firmado,
      ipOrigen: d.ip_origen,
    };
  });
}
