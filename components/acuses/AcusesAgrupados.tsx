"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { AcusesGrupo } from "@/lib/api/acusesAgregados";

function colorPct(pct: number): { barra: string; texto: string } {
  if (pct >= 90) return { barra: "bg-emerald-500", texto: "text-emerald-700" };
  if (pct >= 60) return { barra: "bg-amber-500", texto: "text-amber-700" };
  return { barra: "bg-rose-500", texto: "text-rose-700" };
}

function Fila({ g }: { g: AcusesGrupo }) {
  const c = colorPct(g.pctCumplimiento);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {g.codigo && (
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {g.codigo}
            </div>
          )}
          <div className="font-serif text-base font-semibold leading-tight tracking-tight">
            {g.etiqueta}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-serif text-2xl font-semibold ${c.texto}`}>{g.pctCumplimiento}%</div>
          <div className="text-[11px] text-muted-foreground">al día</div>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${c.barra} transition-all`} style={{ width: `${g.pctCumplimiento}%` }} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {g.firmados} firmado{g.firmados !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          {g.pendientes} pendiente{g.pendientes !== 1 ? "s" : ""}
        </span>
        {g.vencidos > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {g.vencidos} vencido{g.vencidos !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-muted-foreground/70">{g.total} en total</span>
      </div>
    </div>
  );
}

export function AcusesAgrupados({
  grupos,
  vacioTexto,
}: {
  grupos: AcusesGrupo[];
  vacioTexto: string;
}) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        {vacioTexto}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {grupos.map((g) => (
        <Fila key={g.id ?? g.etiqueta} g={g} />
      ))}
    </div>
  );
}
