"use client";

import { useState } from "react";
import { Plus, AlertOctagon, Eye, Lightbulb, Award, FileText, Network, BookOpen } from "lucide-react";
import type { Hallazgo } from "@/lib/api/hallazgos";
import { Button } from "@/components/ui/button";
import { AgregarHallazgoDialog } from "./AgregarHallazgoDialog";

type ReqOpcion = { id: string; clausula: string; titulo: string; norma: string };
type ProcOpcion = { id: string; codigo: string; nombre: string };

type Props = {
  auditoriaId: string;
  hallazgos: Hallazgo[];
  requisitos: ReqOpcion[];
  procesos: ProcOpcion[];
};

const TIPO_META: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  no_conformidad_mayor: { label: "No conformidad mayor", color: "#dc2626", icon: AlertOctagon },
  no_conformidad_menor: { label: "No conformidad menor", color: "#ea580c", icon: AlertOctagon },
  observacion: { label: "Observación", color: "#0284c7", icon: Eye },
  oportunidad_mejora: { label: "Oportunidad de mejora", color: "#7c3aed", icon: Lightbulb },
  fortaleza: { label: "Fortaleza", color: "#059669", icon: Award },
};

const SEVERIDAD_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export function SeccionHallazgos({ auditoriaId, hallazgos, requisitos, procesos }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Hallazgos {hallazgos.length > 0 && `(${hallazgos.length})`}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Registrar hallazgo
        </Button>
      </div>

      {hallazgos.length > 0 ? (
        <div className="space-y-3">
          {hallazgos.map((h) => {
            const meta = TIPO_META[h.tipo] ?? TIPO_META.observacion;
            const Icon = meta.icon;
            return (
              <div key={h.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{h.codigo}</span>
                      <span className="text-xs font-medium" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {h.severidad && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Severidad {SEVERIDAD_LABEL[h.severidad]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground">{h.titulo}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{h.descripcion}</p>
                    {h.evidencia && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Evidencia: </span>{h.evidencia}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {h.requisitoClausula && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" aria-hidden="true" />
                          Requisito {h.requisitoClausula}
                        </span>
                      )}
                      {h.procesoNombre && (
                        <span className="flex items-center gap-1">
                          <Network className="h-3 w-3" aria-hidden="true" />
                          {h.procesoNombre}
                        </span>
                      )}
                      {h.documentoCodigo && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          {h.documentoCodigo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <AlertOctagon className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Sin hallazgos registrados</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Registrá los hallazgos detectados durante la auditoría: no conformidades,
            observaciones, oportunidades de mejora o fortalezas.
          </p>
        </div>
      )}

      <AgregarHallazgoDialog
        auditoriaId={auditoriaId}
        requisitos={requisitos}
        procesos={procesos}
        abierto={abierto}
        onClose={() => setAbierto(false)}
      />
    </section>
  );
}
