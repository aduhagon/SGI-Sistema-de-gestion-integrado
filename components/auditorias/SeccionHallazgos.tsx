"use client";

import { useState } from "react";
import { Plus, AlertOctagon, Eye, Lightbulb, Award, FileText, Network, BookOpen } from "lucide-react";
import type { Hallazgo } from "@/lib/api/hallazgos";
import { Button } from "@/components/ui/button";
import { AgregarHallazgoDialog } from "./AgregarHallazgoDialog";
import { BotonCrearNC } from "./BotonCrearNC";
import { AdjuntosHallazgo } from "./AdjuntosHallazgo";
import type { AdjuntoHallazgo } from "@/lib/api/adjuntos-hallazgo";

type ReqOpcion = { id: string; clausula: string; titulo: string; norma: string };
type ProcOpcion = { id: string; codigo: string; nombre: string };

type Props = {
  auditoriaId: string;
  hallazgos: Hallazgo[];
  requisitos: ReqOpcion[];
  procesos: ProcOpcion[];
  // Estado del flujo en dos instancias.
  puedeRegistrar: boolean;        // equipo con auditoría en curso (o SGI/admin)
  tratamientoHabilitado: boolean; // solo con la auditoría cerrada
  adjuntosPorHallazgo: Record<string, AdjuntoHallazgo[]>;
  puedeAdjuntar: boolean;         // equipo con auditoría en curso
};

const TIPO_META: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  no_conformidad_mayor: { label: "No conformidad mayor", color: "#dc2626", icon: AlertOctagon },
  no_conformidad_menor: { label: "No conformidad menor", color: "#ea580c", icon: AlertOctagon },
  observacion: { label: "Observación", color: "#0284c7", icon: Eye },
  oportunidad_mejora: { label: "Oportunidad de mejora", color: "#7c3aed", icon: Lightbulb },
  fortaleza: { label: "Fortaleza", color: "#059669", icon: Award },
};

const SEVERIDAD_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

// Estado de tratamiento. Sirve tanto para el estado propio del hallazgo
// (observaciones) como para el de la NC asociada, que comparten etiquetas.
const ESTADO_META: Record<string, { label: string; color: string }> = {
  abierto: { label: "Abierta", color: "#dc2626" },
  abierta: { label: "Abierta", color: "#dc2626" },
  en_analisis: { label: "En análisis", color: "#d97706" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrado: { label: "Cerrada", color: "#059669" },
  cerrada: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
};

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

// Una fortaleza es un hallazgo positivo: no se gestiona ni se cierra.
const TIPOS_SIN_TRATAMIENTO = ["fortaleza"];
const TIPOS_NC = ["no_conformidad_mayor", "no_conformidad_menor"];

export function SeccionHallazgos({
  auditoriaId, hallazgos, requisitos, procesos,
  puedeRegistrar, tratamientoHabilitado, adjuntosPorHallazgo, puedeAdjuntar,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Hallazgos {hallazgos.length > 0 && `(${hallazgos.length})`}
        </h2>
        {puedeRegistrar && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Registrar hallazgo
          </Button>
        )}
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
                      {/* Estado de tratamiento. Para NC mostramos el estado de la NC
                          asociada (más informativo); para el resto, el del hallazgo.
                          Las fortalezas no llevan estado. */}
                      {!TIPOS_SIN_TRATAMIENTO.includes(h.tipo) && (() => {
                        const esNC = TIPOS_NC.includes(h.tipo);
                        const estadoCrudo = esNC && h.noConformidadId ? h.ncEstado : h.tratamientoEstado;
                        if (esNC && !h.noConformidadId) return null; // NC sin promover aún
                        const em = estadoCrudo ? ESTADO_META[estadoCrudo] : null;
                        if (!em) return null;
                        const cierre = esNC ? fechaCorta(h.ncFechaCierre) : fechaCorta(h.tratamientoFechaCierre);
                        const cerrada = em.label === "Cerrada";
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: `${em.color}15`, color: em.color }}
                            title={cerrada && cierre ? `Cerrada el ${cierre}` : em.label}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: em.color }} aria-hidden="true" />
                            {em.label}
                            {cerrada && cierre && <span className="font-normal opacity-80">· {cierre}</span>}
                          </span>
                        );
                      })()}
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
                    {(h.tipo === "no_conformidad_mayor" || h.tipo === "no_conformidad_menor") &&
                      !h.noConformidadId && tratamientoHabilitado && (
                        <BotonCrearNC hallazgoId={h.id} />
                      )}
                    {h.noConformidadId && (
                      <a
                        href={`/ncs/${h.noConformidadId}`}
                        className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Ver no conformidad asociada
                      </a>
                    )}
                    {/* Observaciones y oportunidades: link a su propio tratamiento. */}
                    {(h.tipo === "observacion" || h.tipo === "oportunidad_mejora") &&
                      (tratamientoHabilitado || h.tratamientoEstado === "cerrado") && (
                      <a
                        href={`/ncs/observacion/${h.id}`}
                        className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {h.tratamientoEstado === "cerrado" ? "Ver tratamiento" : "Dar tratamiento"}
                      </a>
                    )}
                    {/* Documentación adjunta del hallazgo. */}
                    <AdjuntosHallazgo
                      auditoriaId={auditoriaId}
                      hallazgoId={h.id}
                      adjuntos={adjuntosPorHallazgo[h.id] ?? []}
                      puedeAdjuntar={puedeAdjuntar}
                    />
                    {!tratamientoHabilitado &&
                      (h.tipo === "no_conformidad_mayor" || h.tipo === "no_conformidad_menor") &&
                      !h.noConformidadId && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          El tratamiento (crear la NC) se habilita cuando el auditor líder cierra la auditoría.
                        </p>
                      )}
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
            {puedeRegistrar
              ? "Registrá los hallazgos detectados durante la auditoría: no conformidades, observaciones, oportunidades de mejora o fortalezas."
              : "Los hallazgos se registran con la auditoría en curso, por el equipo auditor asignado."}
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
