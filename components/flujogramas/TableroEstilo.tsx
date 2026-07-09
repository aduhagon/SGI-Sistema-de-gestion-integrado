"use client";

import { useMemo } from "react";
import type { NodoFlujo } from "@/lib/api/flujogramas-tipos";
import { evaluarEstiloLista } from "@/lib/api/flujogramas-tipos";

export function TableroEstilo({
  nodos,
  procesoDeNodo,
}: {
  nodos: NodoFlujo[];
  // mapa nodoId(paso) → nombre de proceso, para dar contexto en la tabla
  procesoDeNodo: Map<string, string>;
}) {
  const avisos = useMemo(() => evaluarEstiloLista(nodos), [nodos]);
  const conSugerencia = avisos.filter((a) => a.sugerencia).length;

  function exportarCsv() {
    const filas = [
      ["Proceso", "Paso", "Título actual", "Regla", "Sugerencia"],
      ...avisos.map((a) => [
        procesoDeNodo.get(a.nodoId) ?? "—",
        (nodos.find((n) => n.id === a.nodoId)?.codigo) ?? "",
        a.titulo,
        a.regla,
        a.sugerencia ?? "",
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estilo-bpmn-flujogramas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (avisos.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-serif text-xl font-semibold">Estilo BPMN</h3>
        <p className="mt-1 text-sm text-muted-foreground">Todos los pasos cumplen las reglas de estilo. 🎉</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">Estilo BPMN — pasos a corregir</h3>
          <p className="text-sm text-muted-foreground">
            {avisos.length} paso{avisos.length !== 1 ? "s" : ""} no cumple{avisos.length === 1 ? "" : "n"} las reglas de redacción
            {conSugerencia > 0 && <span> · {conSugerencia} con sugerencia automática</span>}.
          </p>
        </div>
        <button onClick={exportarCsv} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Exportar CSV
        </button>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-3 font-semibold">Proceso</th>
              <th className="pb-2 pr-3 font-semibold">Título actual</th>
              <th className="pb-2 font-semibold">Sugerencia</th>
            </tr>
          </thead>
          <tbody>
            {avisos.map((a) => (
              <tr key={a.nodoId} className="border-b border-border/60">
                <td className="py-2 pr-3 text-muted-foreground">{procesoDeNodo.get(a.nodoId) ?? "—"}</td>
                <td className="py-2 pr-3">{a.titulo}</td>
                <td className="py-2">
                  {a.sugerencia ? (
                    <span className="font-medium text-amber-700">{a.sugerencia}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{a.regla}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
