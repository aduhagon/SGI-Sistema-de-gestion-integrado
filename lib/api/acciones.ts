import { createClient } from "@/lib/supabase/server";

export type Accion = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  prioridad: string;
  estado: string;
  responsableId: string;
  responsableNombre: string;
  fechaLimite: string;
  fechaCompletada: string | null;
};

export type VerificacionEficacia = {
  id: string;
  resultado: string;
  conclusion: string;
  fechaVerificacion: string;
  verificadorNombre: string;
};

export async function obtenerAccionesDeNC(ncId: string): Promise<Accion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("acciones")
    .select(
      `id, codigo, titulo, descripcion, tipo, prioridad, estado, responsable_id,
       fecha_limite, fecha_completada,
       responsable:usuarios!acciones_responsable_id_fkey (
         username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)
       )`,
    )
    .eq("no_conformidad_id", ncId)
    .eq("activo", true)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar las acciones: ${error.message}`);

  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    codigo: a.codigo,
    titulo: a.titulo,
    descripcion: a.descripcion,
    tipo: a.tipo,
    prioridad: a.prioridad,
    estado: a.estado,
    responsableId: a.responsable_id,
    responsableNombre: a.responsable?.personas
      ? `${a.responsable.personas.nombre} ${a.responsable.personas.apellido}`.trim()
      : a.responsable?.username ?? "—",
    fechaLimite: a.fecha_limite,
    fechaCompletada: a.fecha_completada,
  }));
}

export async function obtenerVerificacionesDeNC(
  ncId: string,
): Promise<VerificacionEficacia[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("verificaciones_eficacia")
    .select(
      `id, resultado, conclusion, fecha_verificacion,
       verificador:usuarios!verificaciones_eficacia_verificador_usuario_id_fkey (
         username, personas:personas!usuarios_persona_id_fkey (nombre, apellido)
       )`,
    )
    .eq("no_conformidad_id", ncId)
    .order("fecha_verificacion", { ascending: false });

  if (error) return [];

  return ((data ?? []) as any[]).map((v) => ({
    id: v.id,
    resultado: v.resultado,
    conclusion: v.conclusion,
    fechaVerificacion: v.fecha_verificacion,
    verificadorNombre: v.verificador?.personas
      ? `${v.verificador.personas.nombre} ${v.verificador.personas.apellido}`.trim()
      : v.verificador?.username ?? "—",
  }));
}

export async function generarCodigoAccion(): Promise<string> {
  const supabase = createClient();
  const anio = new Date().getFullYear();
  const prefijo = `ACC-${anio}-`;
  const { data } = await supabase
    .from("acciones")
    .select("codigo")
    .like("codigo", `${prefijo}%`)
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle();

  let proximo = 1;
  if (data?.codigo) {
    const num = parseInt((data.codigo as string).split("-")[2] ?? "0", 10);
    if (!Number.isNaN(num)) proximo = num + 1;
  }
  return `${prefijo}${String(proximo).padStart(3, "0")}`;
}
