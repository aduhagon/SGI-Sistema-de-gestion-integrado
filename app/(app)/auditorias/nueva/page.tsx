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
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/auditorias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a auditorías
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Nueva auditoría
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Planificar auditoría
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Definí el tipo, la fecha y el alcance. El código se genera automáticamente.
          Después vas a poder sumar el equipo auditor y registrar hallazgos.
        </p>
      </header>

      <AuditoriaForm normas={normas} procesos={procesos} />
    </div>
  );
}
