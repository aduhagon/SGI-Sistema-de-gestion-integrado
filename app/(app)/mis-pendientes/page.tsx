import Link from "next/link";
import { ListChecks, Bell, CheckSquare, PenSquare } from "lucide-react";
import { obtenerMisPendientes } from "@/lib/api/pendientes";
import { CategoriaPendientes } from "@/components/pendientes/CategoriaPendientes";

export const dynamic = "force-dynamic";

export default async function MisPendientesPage() {
  const grupos = await obtenerMisPendientes();
  const total = grupos.reduce((n, g) => n + g.items.length, 0);

  // Total de ítems vencidos o que vencen hoy, en todos los grupos.
  const urgentes = grupos.reduce(
    (n, g) =>
      n +
      g.items.filter(
        (i) => i.nivel === "vencido" || i.nivel === "vencido_hoy",
      ).length,
    0,
  );

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
          Tareas que requieren tu atención, agrupadas por tipo. Incluye
          aprobaciones, acuses de lectura, tratamientos y revisiones próximas o
          vencidas.
        </p>

        {/* Resumen de urgencia */}
        {total > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span>{" "}
            pendiente{total === 1 ? "" : "s"}
            {urgentes > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-red-700">
                  {urgentes} vencido{urgentes === 1 ? "" : "s"} o vence
                  {urgentes === 1 ? "" : "n"} hoy
                </span>
              </>
            )}
          </p>
        )}
      </header>

      {/* Accesos directos a las dos bandejas que cuelgan de esta sección */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/aprobaciones"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
        >
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
          Bandeja de aprobaciones
        </Link>
        <Link
          href="/acuses"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
        >
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          Bandeja de acuses
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No tenés pendientes</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Cuando tengas aprobaciones, acuses, tratamientos o revisiones
            próximas, van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => (
            <CategoriaPendientes
              key={grupo.modulo}
              label={grupo.label}
              items={grupo.items}
              inicialAbierto={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
