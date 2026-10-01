import { createClient } from "@/lib/supabase/server";

export type SaludCorreo = {
  habilitado: boolean;
  zonaHoraria: string;
  consultadoEn: string;
  job: {
    activo?: boolean;
    programacion?: string;
    ultimaEjecucion?: string | null;
    ultimaFinalizacion?: string | null;
    ultimoEstado?: string | null;
    ultimoMensaje?: string | null;
  };
  semana: {
    total: number;
    enviados: number;
    pendientes: number;
    fallidos: number;
    agotados: number;
    ultimoEnvio?: string | null;
  };
  cola: {
    pendientes: number;
    fallidos: number;
    agotados: number;
  };
  fallosRecientes: Array<{
    id: string;
    destinatario: string;
    estado: "fallido" | "agotado";
    intentos: number;
    error: string | null;
    creadoEn: string;
  }>;
};

const VACIO: SaludCorreo = {
  habilitado: false,
  zonaHoraria: "America/Argentina/Buenos_Aires",
  consultadoEn: new Date(0).toISOString(),
  job: {},
  semana: { total: 0, enviados: 0, pendientes: 0, fallidos: 0, agotados: 0 },
  cola: { pendientes: 0, fallidos: 0, agotados: 0 },
  fallosRecientes: [],
};

export async function obtenerSaludCorreo(): Promise<SaludCorreo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_correo_panel_salud");
  if (error || !data) return VACIO;
  return data as SaludCorreo;
}
