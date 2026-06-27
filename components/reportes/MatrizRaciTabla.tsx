"use client";

import { useState } from "react";
import type { MatrizRaci, RaciValor } from "@/lib/api/raci";

const RACI_META: Record<Exclude<RaciValor, null>, { bg: string; fg: string; label: string }> = {
  A: { bg: "#F5C4B3", fg: "#993C1D", label: "Aprueba" },
  R: { bg: "#9FE1CB", fg: "#0F6E56", label: "Ejecuta" },
  C: { bg: "#FAC775", fg: "#854F0B", label: "Consultado" },
  I: { bg: "#E6F1FB", fg: "#185FA5", label: "Informado" },
};

export function MatrizRaciTabla({ matriz, etiquetaColumna }: { matriz: MatrizRaci; etiquetaColumna: string }) {
  const [puestoSel, setPuestoSel] = useState<string | null>(null);

  if (matriz.puestos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay datos para esta matriz todavía.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {matriz.puestos.length} puestos · {matriz.columnas.length} {etiquetaColumna}. Tocá un puesto para ver solo su fila.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-20 border-b border-r border-border bg-muted/60 px-3 py-2 text-left font-medium"
                style={{ minWidth: 180 }}
              >
                Puesto
              </th>
              {matriz.columnas.map((c) => (
                <th
                  key={c.codigo}
                  title={c.etiqueta}
                  className="border-b border-border bg-muted/40 px-1.5 py-2 text-center font-mono text-[10px] font-normal text-muted-foreground"
                  style={{ minWidth: 46 }}
                >
                  {c.codigo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.puestos.map((pu) => {
              const dim = puestoSel && puestoSel !== pu;
              const activo = puestoSel === pu;
              return (
                <tr
                  key={pu}
                  onClick={() => setPuestoSel(activo ? null : pu)}
                  className="cursor-pointer transition-opacity"
                  style={{ opacity: dim ? 0.3 : 1 }}
                >
                  <td
                    className={"sticky left-0 z-10 border-b border-r border-border px-3 py-1.5 " + (activo ? "bg-primary/10 font-medium" : "bg-card")}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {pu}
                  </td>
                  {matriz.columnas.map((c) => {
                    const v = matriz.celdas[pu]?.[c.codigo] ?? null;
                    return (
                      <td key={c.codigo} className="border-b border-border px-1.5 py-1.5 text-center">
                        {v ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-medium"
                            style={{ backgroundColor: RACI_META[v].bg, color: RACI_META[v].fg }}
                            title={RACI_META[v].label}
                          >
                            {v}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { RACI_META };
