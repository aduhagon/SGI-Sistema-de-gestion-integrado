"use client";

import { useState } from "react";
import { Network, BookMarked, AlertTriangle } from "lucide-react";
import type { NCGrupo } from "@/lib/api/tableroNC";

type Corte = "proceso" | "norma" | "severidad";

const TABS: Array<{ id: Corte; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "proceso", label: "Por proceso", icon: Network },
  { id: "norma", label: "Por norma", icon: BookMarked },
  { id: "severidad", label: "Por severidad", icon: AlertTriangle },
];

function Barra({ g }: { g: NCGrupo }) {
  const pctAbiertas = g.total > 0 ? (g.abiertas / g.total) * 100 : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {g.codigo && (
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{g.codigo}</div>
          )}
          <div className="font-serif text-base font-semibold leading-tight tracking-tight">{g.etiqueta}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-2xl font-semibold">{g.total}</div>
          <div className="text-[11px] text-muted-foreground">NC en total</div>
        </div>
      </div>

      {/* Barra apilada: abiertas (rose) + cerradas (emerald) */}
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-rose-400" style={{ width: `${pctAbiertas}%` }} />
        <div className="h-full bg-emerald-500" style={{ width: `${100 - pctAbiertas}%` }} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rose-400" /> {g.abiertas} abierta{g.abiertas !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> {g.cerradas} cerrada{g.cerradas !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto font-medium text-foreground">{g.pctCierre}% cerradas</span>
      </div>
    </div>
  );
}

export function CortesNC({
  porProceso,
  porNorma,
  porSeveridad,
}: {
  porProceso: NCGrupo[];
  porNorma: NCGrupo[];
  porSeveridad: NCGrupo[];
}) {
  const [corte, setCorte] = useState<Corte>("proceso");

  const datos =
    corte === "proceso" ? porProceso : corte === "norma" ? porNorma : porSeveridad;
  const vacioTexto =
    corte === "norma"
      ? "Todavía no hay NC vinculadas a una norma."
      : corte === "proceso"
      ? "Todavía no hay NC vinculadas a un proceso."
      : "Todavía no hay NC registradas.";

  return (
    <div>
      <div className="mb-5 inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((t) => {
          const activo = t.id === corte;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setCorte(t.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (activo ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {datos.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {datos.map((g) => (
            <Barra key={g.id ?? g.etiqueta} g={g} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {vacioTexto}
        </div>
      )}
    </div>
  );
}
