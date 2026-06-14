import { createClient } from "@/lib/supabase/server";
import { ProcessBand } from "@/components/procesos/ProcessBand";
import type { ProcessSummary } from "@/components/procesos/ProcessCard";
import { obtenerSaludProcesos } from "@/lib/api/saludProcesos";

export const dynamic = "force-dynamic";

export default async function ProcesosPage() {
  const supabase = createClient();

  const [{ data: procesos, error }, salud] = await Promise.all([
    supabase
      .from("procesos")
      .select("id, codigo, nombre, descripcion_corta, tipo, color_hex, icono, orden_visualizacion")
      .eq("activo", true)
      .order("orden_visualizacion", { ascending: true }),
    obtenerSaludProcesos(),
  ]);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive mb-2">
            No pudimos cargar los procesos
          </h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // Inyectar los indicadores de salud en cada proceso.
  const procesosList: ProcessSummary[] = (procesos ?? []).map((p) => ({
    ...p,
    salud: salud[p.id] ?? { documentos: 0, ncAbiertas: 0, indicadores: 0 },
  }));

  const estrategicos = procesosList.filter((p) => p.tipo === "estrategico");
  const operativos = procesosList.filter((p) => p.tipo === "operativo");
  const apoyo = procesosList.filter((p) => p.tipo === "apoyo");

  return (
    <div className="relative min-h-screen">
      {/* Fondo atenuado: mapa antiguo, sutil, no compite con los procesos. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-center bg-no-repeat bg-cover opacity-[0.10]"
        style={{ backgroundImage: "url('/mapa-procesos-fondo.webp')" }}
      />
      {/* Velo para asegurar contraste del contenido sobre el fondo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/50 via-background/30 to-background/60"
      />

      <div className="relative z-10 mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Sistema de Gestión Integrado
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          Mapa de procesos
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Vista general de los {procesosList.length} procesos del SGI, organizados
          según el modelo ISO clásico en tres bandas. Cada proceso es la puerta
          de entrada a su documentación, indicadores y responsables.
        </p>
      </header>

      <div className="space-y-10">
        <ProcessBand
          titulo="Procesos estratégicos"
          subtitulo="Dirección y gobierno del SGI"
          procesos={estrategicos}
          colorAcento="#1E3A8A"
        />

        <BandSeparator />

        <ProcessBand
          titulo="Procesos operativos"
          subtitulo="Cadena de valor agroindustrial"
          procesos={operativos}
          colorAcento="#16A34A"
        />

        <BandSeparator />

        <ProcessBand
          titulo="Procesos de apoyo"
          subtitulo="Soporte transversal a la operación"
          procesos={apoyo}
          colorAcento="#D97706"
        />
      </div>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        Los procesos aquí listados constituyen el modelo de referencia del SGI.
        Su configuración (responsables, indicadores, documentación asociada) se
        gestiona desde la pantalla de cada proceso.
      </footer>
      </div>
    </div>
  );
}

function BandSeparator() {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className="relative flex items-center justify-center py-2"
    >
      <div className="h-px flex-1 bg-border" />
      <div className="px-3 text-muted-foreground/60 font-mono text-[10px] uppercase tracking-[0.3em]">
        ↓
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
