import Link from "next/link";
import { ListChecks, AlertOctagon, AlertTriangle, Clock, Bell } from "lucide-react";
import { obtenerMisPendientes, type NivelPendiente } from "@/lib/api/pendientes";

export const dynamic = "force-dynamic";

// Estilo por nivel de escalamiento.
const NIVEL: Record<
  NivelPendiente,
  { label: (d: number | null) => string; dot: string; chip: string; orden: number }
> = {
  vencido: {
    label: (d) => (d != null ? `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}` : "Vencido"),
    dot: "bg-red-600",
    chip: "bg-red-50 text-red-700 border-red-200",
    orden: 0,
  },
  vencido_hoy: {
    label: () => "Vence hoy",
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 border-red-200",
    orden: 1,
  },
  advertencia: {
    label: (d) => (d != null ? `En ${d} día${d === 1 ? "" : "s"}` : "Próximo"),
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    orden: 2,
  },
  recordatorio: {
    label: (d) => (d != null ? `En ${d} días` : "Recordatorio"),
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    orden: 3,
  },
};

export default async function MisPendientesPage() {
  const grupos = await obtenerMisPendientes();
  const total = grupos.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Inicio
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Mis pendientes
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Tareas que requieren tu atención, ordenadas por urgencia. Incluye
          aprobaciones, tratamientos y revisiones próximas o vencidas.
        </p>
      </header>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No tenés pendientes</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Cuando tengas aprobaciones, tratamientos o revisiones próximas,
            van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.modulo}>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {grupo.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {grupo.items.length}
                </span>
              </h2>

              <div className="overflow-hidden rounded-lg border border-border">
                {grupo.items.map((item) => {
                  const meta = NIVEL[item.nivel];
                  return (
                    <Link
                      key={item.entidadId}
                      href={item.urlDestino}
                      className="flex items-center gap-3 border-t border-border px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/40"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`}
                        aria-hidden="true"
                      />
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {item.codigo}
                      </span>
                      <span className="flex-1 truncate text-sm">{item.titulo}</span>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
                      >
                        {meta.label(item.diasRestantes)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
