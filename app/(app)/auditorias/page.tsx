import Link from "next/link";
import { Plus, ClipboardCheck, Calendar, Building2 } from "lucide-react";
import { obtenerAuditorias } from "@/lib/api/auditorias";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

export default async function AuditoriasPage() {
  const auditorias = await obtenerAuditorias();

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

      {auditorias.length > 0 ? (
        <div className="space-y-3">
          {auditorias.map((a) => (
            <Link
              key={a.id}
              href={`/auditorias/${a.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm"
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
                  </div>
                  <h3 className="font-medium text-foreground">{a.titulo}</h3>
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
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardCheck className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No hay auditorías planificadas</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Planificá tu primera auditoría interna o externa para empezar a registrar
            hallazgos y dar seguimiento al SGI.
          </p>
          <Link
            href="/auditorias/nueva"
            className={cn(buttonVariants({ variant: "default" }), "mt-6")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva auditoría
          </Link>
        </div>
      )}
    </div>
  );
}
