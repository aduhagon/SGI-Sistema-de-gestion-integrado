"use client";

import { useMemo } from "react";
import type { NodoFlujo, AristaLike } from "@/lib/api/flujogramas-tipos";
import { detectarSecuenciaRota, PROBLEMA_LABEL } from "@/lib/api/flujogramas-tipos";

const BADGE: Record<string, string> = {
  suelto: "bg-red-100 text-red-700",
  sin_salida: "bg-orange-100 text-orange-700",
  sin_entrada: "bg-orange-100 text-orange-700",
  duplicada: "bg-amber-100 text-amber-700",
};

export function TableroSecuencia({
  nodos,
  aristas,
}: {
  nodos: NodoFlujo[];
  aristas: AristaLike[];
}) {
  const subs = useMemo(() => detectarSecuenciaRota(nodos, aristas), [nodos, aristas]);
  const totalProblemas = subs.reduce((n, s) => n + s.problemas.length, 0);

  if (subs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-serif text-xl font-semibold">Secuencia</h3>
        <p className="mt-1 text-sm text-muted-foreground">Todos los pasos están correctamente conectados. 🎉</p>
      </div>
    );
  }

  function exportarCsv() {
    const filas = [["Proceso", "Subproceso", "Paso", "Título", "Problema", "Detalle"]];
    for (const s of subs) {
      for (const p of s.problemas) {
        filas.push([s.proceso, s.subproceso, p.codigo ?? "", p.titulo, PROBLEMA_LABEL[p.tipo], p.detalle]);
      }
    }
    const csv = filas.map((f) => f.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "secuencia-rota-flujogramas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">Secuencia — conexiones a revisar</h3>
          <p className="text-sm text-muted-foreground">
            {totalProblemas} problema{totalProblemas !== 1 ? "s" : ""} en {subs.length} subproceso{subs.length !== 1 ? "s" : ""}.
            Corregí desde la ficha de cada paso (editar conexiones / reordenar).
          </p>
        </div>
        <button onClick={exportarCsv} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Exportar CSV
        </button>
      </div>
      <div className="max-h-96 space-y-4 overflow-auto">
        {subs.map((s) => (
          <div key={s.subprocesoId}>
            <p className="mb-1 text-sm font-medium">
              {s.proceso} · <span className="text-muted-foreground">{s.subproceso}</span>
            </p>
            <div className="space-y-1">
              {s.problemas.map((p, i) => (
                <div key={p.nodoId + i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[p.tipo]}`}>
                    {PROBLEMA_LABEL[p.tipo]}
                  </span>
                  <span className="text-muted-foreground">{p.codigo ?? ""}</span>
                  <span>{p.titulo}</span>
                  <span className="text-xs text-muted-foreground">— {p.detalle}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
