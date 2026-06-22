import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { listarParticipacionesVigentes } from "@/lib/api/participaciones";
import { ParticipacionGrid } from "@/components/configuracion/ParticipacionGrid";

export const dynamic = "force-dynamic";

export default async function ParticipacionPage() {
  const participaciones = await listarParticipacionesVigentes();

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Participación</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Participación en procesos</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Quién cumple cada rol en cada proceso, según las asignaciones vigentes. Esta es una vista
          de consulta: la participación se deriva de los puestos (qué procesos tiene cada puesto y qué persona lo ocupa).
        </p>
      </header>

      <div className="mb-8 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Para cambiar quién participa, asigná o quitá la persona del puesto correspondiente, o ajustá qué procesos
          tiene ese puesto (en Configuración → Puestos). Los cambios se reflejan acá automáticamente.
        </span>
      </div>

      <ParticipacionGrid filas={participaciones} />
    </div>
  );
}
