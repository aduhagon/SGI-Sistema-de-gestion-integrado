import { AlertTriangle, Layers } from "lucide-react";
import type { AprobacionesGrupo } from "@/lib/api/aprobacionesAgregados";

function Fila({ g }: { g: AprobacionesGrupo }) {
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
          <div className="font-serif text-2xl font-semibold">{g.total}</div>
          <div className="text-[11px] text-muted-foreground">pendientes</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
          {g.nivel1} en nivel 1
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
          {g.nivel2} en nivel 2
        </span>
        {g.vencidas > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {g.vencidas} vencida{g.vencidas !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function AprobacionesPorProceso({
  grupos,
}: {
  grupos: AprobacionesGrupo[];
}) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay aprobaciones pendientes en ningún proceso.
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
