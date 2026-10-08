import Link from "next/link";
import { AlertTriangle, Bell, CalendarClock, CheckSquare, PenSquare, Users } from "lucide-react";
import { obtenerDetalleTableroPendientesResponsables, obtenerMisPendientes, obtenerTableroPendientesResponsables } from "@/lib/api/pendientes";
import { CentroPendientes } from "@/components/pendientes/CentroPendientes";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

const NIVEL_TEXTO = {
  vencido: "Vencido",
  vencido_hoy: "Hoy",
  advertencia: "Próximo",
  recordatorio: "Próximo",
};

const NIVEL_CLASE = {
  vencido: "bg-red-50 text-red-700 ring-red-100",
  vencido_hoy: "bg-amber-50 text-amber-700 ring-amber-100",
  advertencia: "bg-blue-50 text-blue-700 ring-blue-100",
  recordatorio: "bg-slate-50 text-slate-600 ring-slate-100",
};

export default async function MisPendientesPage() {
  const [grupos, tableroGestion, detalleGestion] = await Promise.all([
    obtenerMisPendientes(),
    obtenerTableroPendientesResponsables(),
    obtenerDetalleTableroPendientesResponsables(),
  ]);
  const items = grupos.flatMap((grupo) => grupo.items);
  const total = items.length;
  const vencidos = items.filter((item) => item.nivel === "vencido").length;
  const hoy = items.filter((item) => item.nivel === "vencido_hoy").length;
  const proximos = items.filter((item) => item.nivel === "advertencia" || item.nivel === "recordatorio").length;

  const detallePorResponsable = new Map<string, NonNullable<typeof detalleGestion>>();
  for (const item of detalleGestion ?? []) {
    const clave = item.usuarioId ?? item.responsable;
    detallePorResponsable.set(clave, [...(detallePorResponsable.get(clave) ?? []), item]);
  }

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

    {tableroGestion && tableroGestion.length > 0 ? <section aria-label="Tablero gerencial de pendientes" className="mb-6 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4 text-primary" />Tablero gerencial</h2>
          <p className="mt-1 text-xs text-muted-foreground">Carga de pendientes por usuario y responsable operativo para roles de gestión.</p>
        </div>
        <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{tableroGestion.length} responsables con carga</span>
      </div>
      <div className="space-y-2">
        {tableroGestion.slice(0, 8).map((fila, indice) => {
          const clave = fila.usuarioId ?? fila.responsable;
          const detalle = detallePorResponsable.get(clave) ?? [];

          return <details key={clave} className="group rounded-lg border border-border bg-background p-3" open={indice === 0}>
            <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="line-clamp-1 text-sm font-semibold">{fila.responsable}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{fila.modulos.join(", ") || "Sin módulo informado"}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{fila.total} total</span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{fila.vencidos} vencidos</span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{fila.vencenHoy} hoy</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{fila.proximos} próximos</span>
              </div>
            </summary>
            <div className="mt-3 divide-y divide-border">
              {detalle.slice(0, 6).map((item) => <div key={`${item.modulo}-${item.entidadId}`} className="py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${NIVEL_CLASE[item.nivel]}`}>{NIVEL_TEXTO[item.nivel]}</span>
                      <span className="text-[11px] text-muted-foreground">{item.moduloLabel}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{item.codigo}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{item.titulo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.fechaLimite ? `Fecha limite: ${item.fechaLimite}` : "Sin fecha limite definida"}</p>
                  </div>
                  <Link href={item.urlDestino} className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">Abrir</Link>
                </div>
              </div>)}
              {detalle.length > 6 ? <p className="pt-2 text-xs text-muted-foreground">Mostrando 6 de {detalle.length} pendientes de este responsable.</p> : null}
            </div>
          </details>;
        })}
      </div>
    </section> : null}

    {total === 0 ? <div className="rounded-xl border border-dashed py-16 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><p className="font-medium">No tenés pendientes</p><p className="mt-1 text-sm text-muted-foreground">El sistema no detecta tareas próximas ni vencidas.</p></div> : <CentroPendientes grupos={grupos} />}
  </PageContainer>;
}
