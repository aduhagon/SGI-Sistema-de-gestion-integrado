import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { obtenerProcesosParaAlcance } from "@/lib/api/auditorias";
import { obtenerHallazgosSinNC } from "@/lib/api/ncs";
import { obtenerNormasConRequisitos } from "@/lib/api/matriz";
import { obtenerRequisitosDeNorma } from "@/lib/api/coberturas";
import { NCForm } from "@/components/ncs/NCForm";

export const dynamic = "force-dynamic";

export default async function NuevaNCPage() {
  const [procesos, hallazgos] = await Promise.all([
    obtenerProcesosParaAlcance(),
    obtenerHallazgosSinNC(),
  ]);

  // Normas con requisitos + requisitos por norma, para el selector encadenado.
  const normasConReq = await obtenerNormasConRequisitos();
  const requisitosPorNorma: Record<
    string,
    Awaited<ReturnType<typeof obtenerRequisitosDeNorma>>
  > = {};
  for (const n of normasConReq) {
    requisitosPorNorma[n.versionNormaId] = await obtenerRequisitosDeNorma(
      n.versionNormaId,
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/ncs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Volver a no conformidades
        </Link>
      </nav>
      <header className="mb-10">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Nueva no conformidad</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Abrir no conformidad</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Registrá el incumplimiento detectado. Después vas a poder cargar el análisis de
          causa raíz y, más adelante, las acciones correctivas.
        </p>
      </header>
      <NCForm
        procesos={procesos}
        hallazgos={hallazgos}
        normas={normasConReq}
        requisitosPorNorma={requisitosPorNorma}
      />
    </div>
  );
}
