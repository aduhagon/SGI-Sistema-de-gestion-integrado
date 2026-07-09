"use client";

import { useState } from "react";
import type { NodoFlujo, AristaLike, GapSubproceso } from "@/lib/api/flujogramas-tipos";
import { TableroGaps } from "@/components/flujogramas/TableroGaps";
import { TableroEstilo } from "@/components/flujogramas/TableroEstilo";
import { TableroSecuencia } from "@/components/flujogramas/TableroSecuencia";

// Compila los tableros de alertas en una sección colapsable, debajo del mapa.
// Empieza cerrada para no competir con el mapa de procesos.
export function PanelObservaciones({
  gaps,
  nodos,
  aristas,
  procesoDeNodo,
  totalGaps,
  totalEstilo,
  totalSecuencia,
}: {
  gaps: GapSubproceso[];
  nodos: NodoFlujo[];
  aristas: AristaLike[];
  procesoDeNodo: Map<string, string>;
  totalGaps: number;
  totalEstilo: number;
  totalSecuencia: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const total = totalGaps + totalEstilo + totalSecuencia;

  return (
    <div className="mt-10 border-t border-border pt-6">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{abierto ? "▾" : "▸"}</span>
          <span className="font-medium">Observaciones y recomendaciones</span>
          {total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {total} en total
            </span>
          )}
        </span>
        <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {totalGaps > 0 && <span>{totalGaps} gaps</span>}
          {totalEstilo > 0 && <span>· {totalEstilo} estilo</span>}
          {totalSecuencia > 0 && <span>· {totalSecuencia} secuencia</span>}
        </span>
      </button>

      {abierto && (
        <div className="mt-4 space-y-6">
          <TableroGaps gaps={gaps} />
          <TableroEstilo nodos={nodos} procesoDeNodo={procesoDeNodo} />
          <TableroSecuencia nodos={nodos} aristas={aristas} />
        </div>
      )}
    </div>
  );
}
