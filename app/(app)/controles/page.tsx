import { Suspense } from "react";
import { GestionControles } from "@/components/controles/GestionControles";
import { listarControles, obtenerOpcionesControl } from "@/lib/api/controles";
import { AlertTriangle, ShieldCheck, UserRoundX } from "lucide-react";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function ControlesPage() {
  const [controles, opciones] = await Promise.all([
    listarControles(),
    obtenerOpcionesControl(),
  ]);

  const vencidos = controles.filter(
    (control) => control.estado === "activo" && control.proximaEjecucion && control.proximaEjecucion < new Date().toISOString().slice(0, 10),
  ).length;
  const sinResponsable = controles.filter((control) => !control.responsablePuestoId).length;

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Control y mejora · Eficacia" title="Controles" description={
        <>
          Controles reutilizables por proceso, conectados con riesgos, requisitos, documentos e indicadores. Cada ejecución conserva su evidencia y programa el siguiente vencimiento.
        </>
      }>
        <MetricGrid>
          <MetricCard value={controles.length} label="Controles registrados" icon={<ShieldCheck className="h-4 w-4" />} />
          <MetricCard value={vencidos} label="Vencidos" tone={vencidos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
          <MetricCard value={sinResponsable} label="Sin responsable" tone={sinResponsable ? "warning" : "success"} icon={<UserRoundX className="h-4 w-4" />} />
        </MetricGrid>
      </PageHeader>
      <Suspense fallback={null}>
        <GestionControles controles={controles} opciones={opciones} />
      </Suspense>
    </PageContainer>
  );
}
