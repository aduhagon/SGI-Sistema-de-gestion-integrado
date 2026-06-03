import { createClient } from "@/lib/supabase/server";

export type AcusePendiente = {
  acuseId: string;
  versionId: string;
  documentoId: string;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  fechaGeneracion: string;
  plazoObjetivo: string | null;
  tipo: { codigo: string; nombre: string; color_hex: string | null } | null;
  proceso: { codigo: string; nombre: string } | null;
  hashArchivo: string | null;
};

export type AcuseCompletado = AcusePendiente & {
  fechaAcuse: string;
};

type FilaAcuse = {
  id: string;
  version_id: string;
  fecha_generacion: string;
  fecha_acuse: string | null;
  plazo_objetivo: string | null;
  versiones: {
    id: string;
    documento_id: string;
    numero_version: string;
    archivos: Array<{ tipo_archivo: string; hash_sha256: string | null }> | null;
    documentos: {
      id: string;
      codigo: string;
      titulo: string;
      tipos_documentales: { codigo: string; nombre: string; color_hex: string | null } | null;
      procesos: { codigo: string; nombre: string } | null;
    } | null;
  } | null;
};

const SELECT_ACUSE = `
  id,
  version_id,
  fecha_generacion,
  fecha_acuse,
  plazo_objetivo,
  versiones:versiones!acuses_lectura_version_id_fkey (
    id,
    documento_id,
    numero_version,
    archivos ( tipo_archivo, hash_sha256 ),
    documentos:documentos!versiones_documento_id_fkey (
      id,
      codigo,
      titulo,
      tipos_documentales (codigo, nombre, color_hex),
      procesos:procesos!documentos_proceso_principal_id_fkey (codigo, nombre)
    )
  )
`;

function mapearBase(fila: FilaAcuse) {
  const v = fila.versiones;
  const d = v?.documentos ?? null;
  return {
    acuseId: fila.id,
    versionId: fila.version_id,
    documentoId: v?.documento_id ?? "",
    codigo: d?.codigo ?? "—",
    titulo: d?.titulo ?? "—",
    numeroVersion: v?.numero_version ?? "—",
    fechaGeneracion: fila.fecha_generacion,
    plazoObjetivo: fila.plazo_objetivo,
    tipo: d?.tipos_documentales ?? null,
    proceso: d?.procesos ?? null,
    hashArchivo:
      v?.archivos?.find((a) => a.tipo_archivo === "principal")?.hash_sha256 ?? null,
  };
}

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

export async function obtenerBandejaAcuses(usuarioId: string): Promise<{
  pendientes: AcusePendiente[];
  completados: AcuseCompletado[];
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("acuses_lectura")
    .select(SELECT_ACUSE)
    .eq("usuario_id", usuarioId)
    .order("fecha_generacion", { ascending: false });

  if (error) {
    throw new Error(`No se pudo cargar la bandeja de acuses: ${error.message}`);
  }

  const filas = (data ?? []) as unknown as FilaAcuse[];
  const pendientes: AcusePendiente[] = [];
  const completados: AcuseCompletado[] = [];

  for (const fila of filas) {
    const base = mapearBase(fila);
    if (fila.fecha_acuse) {
      completados.push({ ...base, fechaAcuse: fila.fecha_acuse });
    } else {
      pendientes.push(base);
    }
  }

  return { pendientes, completados };
}

export async function contarAcusesPendientes(usuarioId: string): Promise<number> {
  const { pendientes } = await obtenerBandejaAcuses(usuarioId);
  return pendientes.length;
}
