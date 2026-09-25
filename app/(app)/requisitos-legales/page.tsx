import {
  listarRequisitosLegales,
  listarMarcoLegal,
  listarProcesosParaSelector,
  listarNormasParaSelector,
  sugerirCodigoRequisitoLegal,
} from "@/lib/api/requisitos-legales";
import { GestionRequisitosLegales } from "@/components/requisitos-legales/GestionRequisitosLegales";
import { AlertTriangle, CircleHelp, Scale } from "lucide-react";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function RequisitosLegalesPage() {
  const [requisitos, procesos, normas, codigoSugerido, marcoLegal] = await Promise.all([
    listarRequisitosLegales(),
    listarProcesosParaSelector(),
    listarNormasParaSelector(),
    sugerirCodigoRequisitoLegal(),
    listarMarcoLegal(),
  ]);
  const hoy = new Date().toISOString().slice(0, 10);
  const sinEvaluar = requisitos.filter((r) => !r.ultimoEstado).length;
  const vencidos = requisitos.filter((r) => r.proximaEvaluacion && r.proximaEvaluacion < hoy).length;

  return (
    <PageContainer width="standard">
      <PageHeader
        eyebrow="Cumplimiento · Marco legal"
        title="Requisitos legales"
        description={
          <>
          Registro de los requisitos legales y otros requisitos aplicables al SGI, con su
          vínculo a procesos, certificaciones y evaluaciones periódicas de cumplimiento.
          </>
        }
      >
        <MetricGrid>
          <MetricCard value={requisitos.length} label="Requisitos cargados" icon={<Scale className="h-4 w-4" />} />
          <MetricCard value={sinEvaluar} label="Sin evaluar" tone={sinEvaluar ? "warning" : "success"} icon={<CircleHelp className="h-4 w-4" />} />
          <MetricCard value={vencidos} label="Evaluaciones vencidas" tone={vencidos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        </MetricGrid>
      </PageHeader>

      <GestionRequisitosLegales
        requisitos={requisitos}
        procesos={procesos}
        normas={normas}
        marcoLegal={marcoLegal}
        codigoSugerido={codigoSugerido}
      />
    </PageContainer>
  );
}
