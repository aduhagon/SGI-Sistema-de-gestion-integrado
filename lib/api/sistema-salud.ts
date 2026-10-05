import { createClient } from "@/lib/supabase/server";

export type SaludSistema = {
  consultadoEn: string;
  baseDatos: { operativa: boolean; horaServidor: string | null };
  almacenamiento: { objetos: number; bytes: number };
  automatizaciones: {
    total: number;
    activas: number;
    fallosSieteDias: number;
    jobs: Array<{
      nombre: string;
      programacion: string;
      activa: boolean;
      ultimoEstado: string | null;
      ultimaEjecucion: string | null;
      ultimoMensaje: string | null;
    }>;
  };
  integridad: {
    riesgosPuestoVacante: number;
    ncsResponsableInactivo: number;
    acusesUsuarioInactivo: number;
    alertas: Array<{
      tipo: string;
      codigo: string;
      titulo: string;
      detalle: string;
      url: string;
    }>;
  };
  despliegue: {
    entorno: string;
    rama: string | null;
    version: string | null;
  };
};

const VACIO: Omit<SaludSistema, "despliegue"> = {
  consultadoEn: new Date(0).toISOString(),
  baseDatos: { operativa: false, horaServidor: null },
  almacenamiento: { objetos: 0, bytes: 0 },
  automatizaciones: { total: 0, activas: 0, fallosSieteDias: 0, jobs: [] },
  integridad: {
    riesgosPuestoVacante: 0,
    ncsResponsableInactivo: 0,
    acusesUsuarioInactivo: 0,
    alertas: [],
  },
};

export async function obtenerSaludSistema(): Promise<SaludSistema> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_sistema_panel_salud");
  const diagnostico = error || !data
    ? VACIO
    : data as Omit<SaludSistema, "despliegue">;

  return {
    ...diagnostico,
    despliegue: {
      entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "desconocido",
      rama: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  };
}
