"use client";

import { useMemo } from "react";
import type { GapSubproceso, EstadoGap } from "@/lib/api/flujogramas";

const PUNTO: Record<EstadoGap, string> = { rojo: "🔴", amarillo: "🟡", verde: "🟢", sindatos: "⚪" };
const BADGE: Record<EstadoGap, string> = {
  rojo: "bg-red-100 text-red-700",
  amarillo: "bg-orange-100 text-orange-700",
  verde: "bg-green-100 text-green-700",
  sindatos: "bg-gray-100 text-gray-600",
};

export function TableroGaps({ gaps }: { gaps: GapSubproceso[] }) {
  const conRiesgo = useMemo(() => gaps.filter((g) => g.riesgos > 0), [gaps]);
  const rojos = conRiesgo.filter((g) => g.estado === "rojo").length;
  const amarillos = conRiesgo.filter((g) => g.estado === "amarillo").length;

  function exportarCsv() {
    const filas = [
      ["Proceso", "Subproceso", "Riesgos", "Controles", "Pasos", "Estado"],
      ...conRiesgo.map((g) => [g.proceso, g.subproceso, String(g.riesgos), String(g.controles), String(g.pasos), g.etiqueta]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gaps-flujogramas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">Detección de gaps</h3>
          <p className="text-sm text-muted-foreground">
            Subprocesos con riesgo declarado y su cobertura de control.
            {rojos > 0 && <span className="ml-1 font-medium text-red-600">{rojos} sin control</span>}
            {amarillos > 0 && <span className="ml-1 font-medium text-orange-600">· {amarillos} con cobertura floja</span>}
          </p>
        </div>
        <button onClick={exportarCsv} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Exportar CSV
        </button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-3 font-semibold">Proceso</th>
              <th className="pb-2 pr-3 font-semibold">Subproceso</th>
              <th className="pb-2 pr-3 text-right font-semibold">Riesgos</th>
              <th className="pb-2 pr-3 text-right font-semibold">Controles</th>
              <th className="pb-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {conRiesgo.map((g) => (
              <tr key={g.subprocesoId} className="border-b border-border/60">
                <td className="py-2.5 pr-3">{g.proceso}</td>
                <td className="py-2.5 pr-3">{g.subproceso}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{g.riesgos}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{g.controles}</td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[g.estado]}`}>
                    {PUNTO[g.estado]} {g.etiqueta}
                  </span>
                </td>
              </tr>
            ))}
            {conRiesgo.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No hay subprocesos con riesgo declarado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
