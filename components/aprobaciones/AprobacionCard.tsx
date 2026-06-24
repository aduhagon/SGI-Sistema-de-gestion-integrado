"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, FileText, ArrowRight, Hourglass, FileSearch } from "lucide-react";
import type { AprobacionPendiente } from "@/lib/api/aprobaciones";
import { Button } from "@/components/ui/button";
import { DecisionDialog } from "./DecisionDialog";

type Props = {
  aprobacion: AprobacionPendiente;
  // si es false, la tarjeta es solo informativa (en espera de N1)
  accionable: boolean;
};

export function AprobacionCard({ aprobacion, accionable }: Props) {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [decisionInicial, setDecisionInicial] = useState<
    "aprobado" | "rechazado" | null
  >(null);

  function abrir(decision: "aprobado" | "rechazado" | null) {
    setDecisionInicial(decision);
    setDialogAbierto(true);
  }

  const vencido =
    aprobacion.plazoObjetivo && new Date(aprobacion.plazoObjetivo) < new Date();

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Nivel {aprobacion.nivel}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {aprobacion.codigo}
              </span>
              {aprobacion.tipo && (
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${aprobacion.tipo.color_hex ?? "#475569"}15`,
                    color: aprobacion.tipo.color_hex ?? "#475569",
                  }}
                >
                  {aprobacion.tipo.nombre}
                </span>
              )}
            </div>

            <Link
              href={`/documentos/${aprobacion.documentoId}`}
              className="group block"
            >
              <h3 className="font-medium text-foreground group-hover:underline">
                {aprobacion.titulo}
              </h3>
            </Link>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Versión {aprobacion.numeroVersion}
              </span>
              {aprobacion.proceso && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{aprobacion.proceso.nombre}</span>
                </>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Iniciada{" "}
                {new Date(aprobacion.iniciadaEn).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {vencido && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                  Plazo vencido
                </span>
              )}
            </div>

            {aprobacion.motivoCambio && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Motivo del cambio: </span>
                {aprobacion.motivoCambio}
              </p>
            )}

            {aprobacion.archivoId && (
              <a
                href={`/api/archivos/${aprobacion.archivoId}/descargar?modo=ver`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                Ver documento
              </a>
            )}

            {aprobacion.nivel === 2 && (
              <p className="mt-2 text-xs text-emerald-700">
                Nivel 1 ya aprobó. Tu decisión cierra el flujo de aprobación.
              </p>
            )}
          </div>

          {accionable ? (
            <div className="flex shrink-0 flex-col gap-2">
              <Button size="sm" onClick={() => abrir("aprobado")}>
                Decidir
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
              Espera N1
            </div>
          )}
        </div>
      </div>

      {accionable && (
        <DecisionDialog
          aprobacionId={aprobacion.aprobacionId}
          nivel={aprobacion.nivel}
          codigo={aprobacion.codigo}
          titulo={aprobacion.titulo}
          numeroVersion={aprobacion.numeroVersion}
          archivoId={aprobacion.archivoId}
          abierto={dialogAbierto}
          decisionInicial={decisionInicial}
          onClose={() => setDialogAbierto(false)}
        />
      )}
    </>
  );
}
