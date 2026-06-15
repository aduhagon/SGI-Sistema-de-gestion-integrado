import {
  listarRequisitosLegales,
  listarProcesosParaSelector,
  listarNormasParaSelector,
  sugerirCodigoRequisitoLegal,
} from "@/lib/api/requisitos-legales";
import { GestionRequisitosLegales } from "@/components/requisitos-legales/GestionRequisitosLegales";

export const dynamic = "force-dynamic";

export default async function RequisitosLegalesPage() {
  const [requisitos, procesos, normas, codigoSugerido] = await Promise.all([
    listarRequisitosLegales(),
    listarProcesosParaSelector(),
    listarNormasParaSelector(),
    sugerirCodigoRequisitoLegal(),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sistema de Gestión Integrado
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Requisitos legales y otros requisitos
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Registro de los requisitos legales y otros requisitos aplicables al SGI, con su
          vínculo a los procesos y la evaluación periódica de cumplimiento. Da respuesta a los
          puntos 6.1.3 de ISO 14001 e ISO 45001.
        </p>
      </header>

      <GestionRequisitosLegales
        requisitos={requisitos}
        procesos={procesos}
        normas={normas}
        codigoSugerido={codigoSugerido}
      />
    </div>
  );
}
