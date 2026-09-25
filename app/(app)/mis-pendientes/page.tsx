import Link from "next/link";
import { AlertTriangle, Bell, CalendarClock, CheckSquare, PenSquare } from "lucide-react";
import { obtenerMisPendientes } from "@/lib/api/pendientes";
import { CentroPendientes } from "@/components/pendientes/CentroPendientes";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function MisPendientesPage() {
  const grupos = await obtenerMisPendientes();
  const items = grupos.flatMap((grupo) => grupo.items);
  const total = items.length;
  const vencidos = items.filter((item) => item.nivel === "vencido").length;
  const hoy = items.filter((item) => item.nivel === "vencido_hoy").length;
  const proximos = items.filter((item) => item.nivel === "advertencia" || item.nivel === "recordatorio").length;

  return <PageContainer width="wide">
    <PageHeader eyebrow="Mi trabajo" title="Centro de pendientes" description="Una cola única, ordenada por urgencia, para resolver aprobaciones, controles, requisitos legales, riesgos y demás compromisos del sistema." actions={<>
      <Link href="/aprobaciones" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><CheckSquare className="h-4 w-4" />Aprobaciones</Link>
      <Link href="/acuses" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><PenSquare className="h-4 w-4" />Acuses</Link>
    </>}>
      <MetricGrid>
        <MetricCard value={total} label="Pendientes" icon={<Bell className="h-4 w-4" />} />
        <MetricCard value={vencidos} label="Vencidos" tone={vencidos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard value={hoy} label="Vencen hoy" tone={hoy ? "warning" : "success"} icon={<CalendarClock className="h-4 w-4" />} />
        <MetricCard value={proximos} label="Próximos" tone="info" icon={<CalendarClock className="h-4 w-4" />} />
      </MetricGrid>
    </PageHeader>
    {total === 0 ? <div className="rounded-xl border border-dashed py-16 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><p className="font-medium">No tenés pendientes</p><p className="mt-1 text-sm text-muted-foreground">El sistema no detecta tareas próximas ni vencidas.</p></div> : <CentroPendientes grupos={grupos} />}
  </PageContainer>;
}
