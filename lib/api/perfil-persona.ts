import { createClient } from "@/lib/supabase/server";

export type PersonaPerfil = {
  personaId: string;
  nombre: string;
  email: string | null;
  area: string | null;
  puestos: string[];
  tieneUsuario: boolean;
  rolesGlobales: string[];
};

export type FilaRaci = { codigo: string; etiqueta: string; raci: "A" | "R" | "C" | "I" };

export type PerfilRaci = {
  porProceso: FilaRaci[];
  porDocumento: FilaRaci[];
  resumen: { proceso: Conteo; documento: Conteo };
};

type Conteo = { A: number; R: number; C: number; I: number };

function contar(filas: FilaRaci[]): Conteo {
  const c: Conteo = { A: 0, R: 0, C: 0, I: 0 };
  for (const f of filas) c[f.raci]++;
  return c;
}

// ── Lista de personas (panel maestro) ───────────────────────────────────────
export async function obtenerPersonasParaPerfil(): Promise<PersonaPerfil[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_personas_para_perfil");
  if (error || !data) return [];
  return (data as Array<{
    persona_id: string; nombre: string; email: string | null; area: string | null;
    puestos: string[] | null; tiene_usuario: boolean; roles_globales: string[] | null;
  }>).map((r) => ({
    personaId: r.persona_id,
    nombre: r.nombre,
    email: r.email,
    area: r.area,
    puestos: r.puestos ?? [],
    tieneUsuario: r.tiene_usuario,
    rolesGlobales: r.roles_globales ?? [],
  }));
}

// ── RACI consolidado de una persona (proceso + documento) ───────────────────
export async function obtenerPerfilRaci(personaId: string): Promise<PerfilRaci> {
  const supabase = createClient();
  const [{ data: proc }, { data: doc }] = await Promise.all([
    supabase.rpc("fn_raci_persona_proceso", { p_persona_id: personaId }),
    supabase.rpc("fn_raci_persona_documento", { p_persona_id: personaId }),
  ]);

  const porProceso: FilaRaci[] = ((proc ?? []) as Array<{ proceso_codigo: string; proceso_nombre: string; raci: string }>)
    .map((r) => ({ codigo: r.proceso_codigo, etiqueta: r.proceso_nombre, raci: r.raci as FilaRaci["raci"] }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));

  const porDocumento: FilaRaci[] = ((doc ?? []) as Array<{ documento_codigo: string; documento_titulo: string; raci: string }>)
    .map((r) => ({ codigo: r.documento_codigo, etiqueta: r.documento_titulo, raci: r.raci as FilaRaci["raci"] }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));

  return {
    porProceso,
    porDocumento,
    resumen: { proceso: contar(porProceso), documento: contar(porDocumento) },
  };
}
