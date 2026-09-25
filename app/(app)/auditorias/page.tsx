import Link from "next/link";
import { Plus, ClipboardCheck, Calendar, Building2, AlertTriangle, PlayCircle } from "lucide-react";
import { obtenerAuditorias } from "@/lib/api/auditorias";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AuditoriaFilters } from "@/components/auditorias/AuditoriaFilters";
import { MetricCard, MetricGrid } from "@/components/ui/page";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  interna: "Interna",
  externa: "Externa",
  certificacion: "Certificación",
  vigilancia: "Vigilancia",
  recertificacion: "Recertificación",
};

const ESTADO_LABEL: Record<string, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  informe_emitido: "Informe emitido",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const ESTADO_COLOR: Record<string, string> = {
  planificada: "#0284c7",
  en_curso: "#d97706",
  informe_emitido: "#7c3aed",
  cerrada: "#059669",
  cancelada: "#6b7280",
};

type Props = { searchParams: { q?: string; estado?: string } };

export default async function AuditoriasPage({ searchParams }: Props) {
  const auditorias = await obtenerAuditorias();
  const termino = searchParams.q?.trim().toLocaleLowerCase("es") ?? "";
  const estado = searchParams.estado ?? "";
  const visibles = auditorias.filter((auditoria) => {
    const texto = `${auditoria.codigo} ${auditoria.titulo} ${auditoria.entidadCertificadora ?? ""}`.toLocaleLowerCase("es");
    return (!estado || auditoria.estado === estado) && (!termino || texto.includes(termino));
  });
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const activas = auditorias.filter((a) => ["planificada", "en_curso", "informe_emitido"].includes(a.estado)).length;
  const vencidas = auditorias.filter((a) => a.estado === "planificada" && new Date(`${a.fechaPlanificada}T00:00:00`) < hoy).length;
  const hallazgos = auditorias.reduce((total, auditoria) => total + auditoria.cantidadHallazgos, 0);
  const hayFiltros = Boolean(termino || estado);

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Calidad · Auditorías
          </p>
          <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
            Auditorías
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Planificación y seguimiento de auditorías internas y externas del SGI, con
            su alcance de normas y procesos.
          </p>
        </div>
        <Link href="/auditorias/nueva" className={cn(buttonVariants({ variant: "default" }))}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva auditoría
        </Link>
      </header>

      <MetricGrid>
        <MetricCard value={auditorias.length} label="Total auditorías" icon={<ClipboardCheck className="h-4 w-4" />} />
        <MetricCard value={activas} label="Activas" tone={activas ? "warning" : "success"} icon={<PlayCircle className="h-4 w-4" />} />
        <MetricCard value={vencidas} label="Planificadas vencidas" tone={vencidas ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard value={hallazgos} label="Hallazgos registrados" icon={<ClipboardCheck className="h-4 w-4" />} />
      </MetricGrid>

      <AuditoriaFilters total={visibles.length} />

      {visibles.length > 0 ? (
        <div className="space-y-3">
          {visibles.map((a) => {
            const planificadaVencida = a.estado === "planificada" && new Date(`${a.fechaPlanificada}T00:00:00`) < hoy;
            return (
            <Link
              key={a.id}
              href={`/auditorias/${a.id}`}
              className={cn("group block rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm sm:p-5", planificadaVencida ? "border-rose-300 bg-rose-50/30" : "border-border")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">{a.codigo}</Badge>
                    <span className="text-xs text-muted-foreground">{TIPO_LABEL[a.tipo] ?? a.tipo}</span>
                    <span
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: `${ESTADO_COLOR[a.estado] ?? "#6b7280"}15`,
                        color: ESTADO_COLOR[a.estado] ?? "#6b7280",
                      }}
                    >
                      {ESTADO_LABEL[a.estado] ?? a.estado}
                    </span>
                    {planificadaVencida ? <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-700"><AlertTriangle className="h-3 w-3" aria-hidden="true" />Planificación vencida</span> : null}
                  </div>
                  <h3 className="font-medium text-foreground group-hover:text-primary">{a.titulo}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {new Date(a.fechaPlanificada).toLocaleDateString("es-AR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                    {a.entidadCertificadora && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          {a.entidadCertificadora}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span>{a.cantidadHallazgos} hallazgo{a.cantidadHallazgos === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </div>
            </Link>
          )})}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardCheck className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">{hayFiltros ? "No hay coincidencias" : "No hay auditorías planificadas"}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {hayFiltros ? "Probá con otra búsqueda o limpiá los filtros activos." : "Planificá tu primera auditoría interna o externa para empezar a registrar hallazgos y dar seguimiento al SGI."}
          </p>
          {!hayFiltros ? <Link
            href="/auditorias/nueva"
            className={cn(buttonVariants({ variant: "default" }), "mt-6")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva auditoría
          </Link> : null}
        </div>
      )}
    </div>
  );
}
