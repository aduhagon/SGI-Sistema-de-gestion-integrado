import { createClient } from "@/lib/supabase/server";

export type NivelPendiente = 1 | 2;

export type AprobacionPendiente = {
  aprobacionId: string;
  versionId: string;
  documentoId: string;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  motivoCambio: string | null;
  nivel: NivelPendiente;
  // estado del otro nivel, para contexto
  decisionN1: string;
  decisionN2: string;
  iniciadaEn: string;
  plazoObjetivo: string | null;
  tipo: { codigo: string; nombre: string; color_hex: string | null } | null;
  proceso: { codigo: string; nombre: string } | null;
  elaborador: string | null;
  hashArchivo: string | null;
  // id del archivo principal de la versión (para previsualizar/descargar antes de decidir)
  archivoId: string | null;
};

type FilaAprobacion = {
  id: string;
  version_id: string;
  aprobador_n1_id: string | null;
  aprobador_n2_id: string | null;
  decision_n1: string;
  decision_n2: string;
  iniciada_en: string;
  plazo_objetivo_n1: string | null;
  plazo_objetivo_n2: string | null;
  versiones: {
    id: string;
    documento_id: string;
    numero_version: string;
    motivo_cambio: string | null;
    estado: string;
    archivos: Array<{ id: string; tipo_archivo: string; hash_sha256: string | null }> | null;
    creado_por: string | null;
    documentos: {
      id: string;
      codigo: string;
      titulo: string;
      tipos_documentales: { codigo: string; nombre: string; color_hex: string | null } | null;
      procesos: { codigo: string; nombre: string } | null;
    } | null;
  } | null;
};

/**
 * Devuelve el id interno (public.usuarios.id) del usuario autenticado.
 * El esquema mapea auth.users.id -> usuarios.auth_user_id.
 */
export async function obtenerUsuarioActualId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data?.id as string) ?? null;
}

/**
 * Aprobaciones que esperan la decisión del usuario actual.
 * - Nivel 1: soy aprobador_n1 y decision_n1 = 'pendiente'.
 * - Nivel 2: soy aprobador_n2, decision_n1 = 'aprobado' y decision_n2 = 'pendiente'.
 *   (El N2 no decide hasta que N1 aprobó. Si N1 rechazó, no llega a N2.)
 *
 * También devuelve las que están "en espera de N1" donde soy N2, para dar contexto.
 */
export async function obtenerBandejaAprobaciones(usuarioId: string): Promise<{
  paraDecidir: AprobacionPendiente[];
  enEsperaN1: AprobacionPendiente[];
}> {
  const supabase = createClient();

  const select = `
    id,
    version_id,
    aprobador_n1_id,
    aprobador_n2_id,
    decision_n1,
    decision_n2,
    iniciada_en,
    plazo_objetivo_n1,
    plazo_objetivo_n2,
    versiones:versiones!aprobaciones_version_id_fkey (
      id,
      documento_id,
      numero_version,
      motivo_cambio,
      estado,
      archivos ( id, tipo_archivo, hash_sha256 ),
      creado_por,
      documentos:documentos!versiones_documento_id_fkey (
        id,
        codigo,
        titulo,
        tipos_documentales (codigo, nombre, color_hex),
        procesos:procesos!documentos_proceso_principal_id_fkey (codigo, nombre)
      )
    )
  `;

  // Trae todas las aprobaciones abiertas donde participo (RLS ya limita a las visibles).
  const { data, error } = await supabase
    .from("aprobaciones")
    .select(select)
    .is("cerrada_en", null)
    .or(`aprobador_n1_id.eq.${usuarioId},aprobador_n2_id.eq.${usuarioId}`)
    .order("iniciada_en", { ascending: true });

  if (error) {
    throw new Error(`No se pudo cargar la bandeja de aprobaciones: ${error.message}`);
  }

  const filas = (data ?? []) as unknown as FilaAprobacion[];

  const paraDecidir: AprobacionPendiente[] = [];
  const enEsperaN1: AprobacionPendiente[] = [];

  for (const fila of filas) {
    const v = fila.versiones;
    const d = v?.documentos ?? null;

    const archivoPrincipal =
      v?.archivos?.find((a) => a.tipo_archivo === "principal") ?? null;

    const base = {
      aprobacionId: fila.id,
      versionId: fila.version_id,
      documentoId: v?.documento_id ?? "",
      codigo: d?.codigo ?? "—",
      titulo: d?.titulo ?? "—",
      numeroVersion: v?.numero_version ?? "—",
      motivoCambio: v?.motivo_cambio ?? null,
      decisionN1: fila.decision_n1,
      decisionN2: fila.decision_n2,
      iniciadaEn: fila.iniciada_en,
      tipo: d?.tipos_documentales ?? null,
      proceso: d?.procesos ?? null,
      elaborador: v?.creado_por ?? null,
      hashArchivo: archivoPrincipal?.hash_sha256 ?? null,
      archivoId: archivoPrincipal?.id ?? null,
    };

    const soyN1 = fila.aprobador_n1_id === usuarioId;
    const soyN2 = fila.aprobador_n2_id === usuarioId;

    if (soyN1 && fila.decision_n1 === "pendiente") {
      paraDecidir.push({ ...base, nivel: 1, plazoObjetivo: fila.plazo_objetivo_n1 });
    } else if (soyN2 && fila.decision_n1 === "aprobado" && fila.decision_n2 === "pendiente") {
      paraDecidir.push({ ...base, nivel: 2, plazoObjetivo: fila.plazo_objetivo_n2 });
    } else if (soyN2 && fila.decision_n1 === "pendiente") {
      // Todavía no es mi turno: N1 no decidió.
      enEsperaN1.push({ ...base, nivel: 2, plazoObjetivo: fila.plazo_objetivo_n2 });
    }
  }

  return { paraDecidir, enEsperaN1 };
}

/**
 * Cantidad de aprobaciones que esperan decisión del usuario (para el dashboard/badge).
 */
export async function contarAprobacionesPendientes(usuarioId: string): Promise<number> {
  const { paraDecidir } = await obtenerBandejaAprobaciones(usuarioId);
  return paraDecidir.length;
}
