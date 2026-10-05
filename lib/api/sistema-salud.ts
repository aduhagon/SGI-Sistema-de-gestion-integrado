import { createClient } from "@/lib/supabase/server";

export type SaludSistema = {
  consultadoEn: string;
  baseDatos: { operativa: boolean; horaServidor: string | null };
  almacenamiento: { objetos: number; bytes: number };
  automatizaciones: {
    total: number;
    activas: number;
    fallosSieteDias: number;
    jobsConFallaActual: number;
    sinEjecuciones: number;
    recuperadas: number;
    jobs: Array<{
      nombre: string;
      programacion: string;
      activa: boolean;
      ultimoEstado: string | null;
      ultimaEjecucion: string | null;
      ultimoMensaje: string | null;
      estadoActual: "operativa" | "recuperada" | "fallando" | "en_curso" | "sin_ejecuciones" | "inactiva";
      ultimaFinalizacion: string | null;
      ultimoExito: string | null;
      ultimoFallo: string | null;
      duracionSegundos: number | null;
      fallosSieteDias: number;
      historial: Array<{
        estado: string;
        inicio: string;
        fin: string | null;
        duracionSegundos: number | null;
        mensaje: string | null;
      }>;
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
  integraciones: {
    supabaseConfigurada: boolean;
    vercelConfigurada: boolean;
    sentryConfigurado: boolean;
    speedInsightsConfigurado: boolean;
  };
};

type DiagnosticoBase = Omit<SaludSistema, "despliegue" | "integraciones">;

const VACIO: DiagnosticoBase = {
  consultadoEn: new Date(0).toISOString(),
  baseDatos: { operativa: false, horaServidor: null },
  almacenamiento: { objetos: 0, bytes: 0 },
  automatizaciones: { total: 0, activas: 0, fallosSieteDias: 0, jobsConFallaActual: 0, sinEjecuciones: 0, recuperadas: 0, jobs: [] },
  integridad: {
    riesgosPuestoVacante: 0,
    ncsResponsableInactivo: 0,
    acusesUsuarioInactivo: 0,
    alertas: [],
  },
};

export async function obtenerSaludSistema(): Promise<SaludSistema> {
  const supabase = createClient();
  const [{ data, error }, automatizaciones] = await Promise.all([
    supabase.rpc("fn_sistema_panel_salud"),
    supabase.rpc("fn_sistema_automatizaciones_salud"),
  ]);
  const diagnostico = error || !data
    ? VACIO
    : data as DiagnosticoBase;

  return {
    ...diagnostico,
    automatizaciones: automatizaciones.error || !automatizaciones.data
      ? diagnostico.automatizaciones
      : automatizaciones.data as SaludSistema["automatizaciones"],
    despliegue: {
      entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "desconocido",
      rama: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
    integraciones: {
      supabaseConfigurada: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      vercelConfigurada: Boolean(process.env.VERCEL_ENV && process.env.VERCEL_URL),
      sentryConfigurado: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      speedInsightsConfigurado: true,
    },
  };
}
