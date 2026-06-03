"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, FileText, PenLine, CheckCircle2 } from "lucide-react";
import type { AcusePendiente, AcuseCompletado } from "@/lib/api/acuses";
import { Button } from "@/components/ui/button";
import { FirmaDialog } from "./FirmaDialog";

type Props =
  | { acuse: AcusePendiente; completado?: false }
  | { acuse: AcuseCompletado; completado: true };

export function AcuseCard({ acuse, completado }: Props) {
  const [abierto, setAbierto] = useState(false);

  const vencido =
    !completado && acuse.plazoObjetivo && new Date(acuse.plazoObjetivo) < new Date();

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{acuse.codigo}</span>
              {acuse.tipo && (
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${acuse.tipo.color_hex ?? "#475569"}15`,
                    color: acuse.tipo.color_hex ?? "#475569",
                  }}
                >
                  {acuse.tipo.nombre}
                </span>
              )}
            </div>

            <Link href={`/documentos/${acuse.documentoId}`} className="group block">
              <h3 className="font-medium text-foreground group-hover:underline">
                {acuse.titulo}
              </h3>
            </Link>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Versión {acuse.numeroVersion}
              </span>
              {acuse.proceso && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{acuse.proceso.nombre}</span>
                </>
              )}
              {completado ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Firmado{" "}
                    {new Date(acuse.fechaAcuse).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Generado{" "}
                    {new Date(acuse.fechaGeneracion).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {vencido && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                      Plazo vencido
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {!completado && (
            <div className="shrink-0">
              <Button size="sm" onClick={() => setAbierto(true)}>
                <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                Firmar
              </Button>
            </div>
          )}
        </div>
      </div>

      {!completado && (
        <FirmaDialog
          acuseId={acuse.acuseId}
          codigo={acuse.codigo}
          titulo={acuse.titulo}
          numeroVersion={acuse.numeroVersion}
          hashArchivo={acuse.hashArchivo}
          abierto={abierto}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}
