import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  obtenerNormasParaAlcance,
  obtenerProcesosParaAlcance,
} from "@/lib/api/auditorias";
import { AuditoriaForm } from "@/components/auditorias/AuditoriaForm";

export const dynamic = "force-dynamic";

export default async function NuevaAuditoriaPage() {
  const [normas, procesos] = await Promise.all([
    obtenerNormasParaAlcance(),
    obtenerProcesosParaAlcance(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-6 lg:p-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/auditorias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a auditorías
        </Link>
      </nav>

      <header className="mb-6">
        <p className="mb-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Nueva auditoría
        </p>
        <h1 className="mb-1.5 font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
          Planificar auditoría
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Definí el tipo, la fecha y el alcance. El código se genera automáticamente.
        </p>
      </header>

      <AuditoriaForm normas={normas} procesos={procesos} />
    </div>
  );
}
