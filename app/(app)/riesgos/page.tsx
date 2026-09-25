import { Suspense } from "react";
import {
  listarRiesgos, obtenerDatosFormRiesgo, obtenerArbolRiesgos,
  listarNormasPorRiesgo,
} from "@/lib/api/riesgos";
import { listarControlesComoOpcion, listarControlesPorRiesgo } from "@/lib/api/controles";
import { RiesgosVista } from "@/components/riesgos/RiesgosVista";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function RiesgosPage() {
  const [riesgos, { procesos, puestos, normas }, arbol, controlesPorRiesgo, controlesOpc, normasPorRiesgo] = await Promise.all([
    listarRiesgos(),
    obtenerDatosFormRiesgo(),
    obtenerArbolRiesgos(),
    listarControlesPorRiesgo(),
    listarControlesComoOpcion(),
    listarNormasPorRiesgo(),
  ]);

  const extremos = riesgos.filter((r) => r.nivel === "extremo").length;
  const altos = riesgos.filter((r) => r.nivel === "alto").length;

  return (
    <PageContainer width="standard">
      <PageHeader eyebrow="Control y mejora · Riesgos" title="Riesgos por proceso" description={
        <>
          Identificación, evaluación y tratamiento de riesgos y oportunidades de cada proceso,
          evaluados por probabilidad e impacto.
        </>
      }>
        <MetricGrid>
          <MetricCard value={riesgos.length} label="Riesgos registrados" icon={<ShieldAlert className="h-4 w-4" />} />
          <MetricCard value={extremos} label="Nivel extremo" tone={extremos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
          <MetricCard value={altos} label="Nivel alto" tone={altos ? "warning" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        </MetricGrid>
      </PageHeader>
      <Suspense fallback={null}>
        <RiesgosVista riesgos={riesgos} procesos={procesos} puestos={puestos} arbol={arbol} controlesPorRiesgo={controlesPorRiesgo} controlesOpc={controlesOpc} normasOpc={normas} normasPorRiesgo={normasPorRiesgo} />
      </Suspense>
    </PageContainer>
  );
}
