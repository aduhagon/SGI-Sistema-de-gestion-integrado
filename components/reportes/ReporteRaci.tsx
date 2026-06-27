"use client";

import { useState } from "react";
import { Network, FileText, Download, Printer, FlipHorizontal2 } from "lucide-react";
import type { MatrizRaci } from "@/lib/api/raci";
import { MatrizRaciTabla, RACI_META } from "@/components/reportes/MatrizRaciTabla";

type Tab = "proceso" | "documento";

export function ReporteRaci({ porProceso, porDocumento }: { porProceso: MatrizRaci; porDocumento: MatrizRaci }) {
  const [tab, setTab] = useState<Tab>("proceso");
  const [transpuesta, setTranspuesta] = useState(false);

  const matriz = tab === "proceso" ? porProceso : porDocumento;
  const etiquetaColumna = tab === "proceso" ? "procesos" : "documentos";
  const titulo = tab === "proceso" ? "RACI Puesto × Proceso" : "RACI Puesto × Documento";

  // ── Export a Excel (.xls vía tabla HTML; Excel lo abre nativo) ─────────────
  function exportarExcel() {
    // Ejes según orientación: normal = filas puestos; transpuesta = filas columnas.
    const ejeFilas = transpuesta
      ? matriz.columnas.map((c) => ({ clave: c.codigo, etiqueta: c.codigo }))
      : matriz.puestos.map((p) => ({ clave: p, etiqueta: p }));
    const ejeCols = transpuesta
      ? matriz.puestos.map((p) => ({ clave: p, etiqueta: p }))
      : matriz.columnas.map((c) => ({ clave: c.codigo, etiqueta: c.codigo }));

    const leerCelda = (filaClave: string, colClave: string) => {
      const puesto = transpuesta ? colClave : filaClave;
      const columna = transpuesta ? filaClave : colClave;
      return matriz.celdas[puesto]?.[columna] ?? "";
    };

    const encabezados = ejeCols.map((c) => `<th>${escapar(c.etiqueta)}</th>`).join("");
    const filasHtml = ejeFilas
      .map((f) => {
        const celdas = ejeCols.map((c) => `<td>${leerCelda(f.clave, c.clave)}</td>`).join("");
        return `<tr><td>${escapar(f.etiqueta)}</td>${celdas}</tr>`;
      })
      .join("");
    const esquina = transpuesta ? etiquetaColumna.charAt(0).toUpperCase() + etiquetaColumna.slice(1, -1) : "Puesto";
    const leyenda = matriz.columnas.map((c) => `${c.codigo}: ${escapar(c.etiqueta)}`).join(" | ");

    const html =
      `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>` +
      `<h3>${escapar(titulo)}</h3>` +
      `<table border="1"><thead><tr><th>${escapar(esquina)}</th>${encabezados}</tr></thead><tbody>${filasHtml}</tbody></table>` +
      `<p>A = aprueba · R = ejecuta · I = informado</p>` +
      `<p>${leyenda}</p></body></html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" });
    descargar(blob, `raci-${tab}${transpuesta ? "-transpuesta" : ""}.xls`);
  }

  // ── Export a PDF: usa el diálogo de impresión del navegador ────────────────
  function exportarPdf() {
    window.print();
  }

  return (
    <div>
      {/* Estilos de impresión: solo la matriz activa, sin controles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #raci-print, #raci-print * { visibility: visible; }
          #raci-print { position: absolute; left: 0; top: 0; width: 100%; }
          .raci-no-print { display: none !important; }
          #raci-print table { font-size: 9px; }
        }
      `}</style>

      {/* Controles: pestañas + export (no se imprimen) */}
      <div className="raci-no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setTab("proceso")}
            className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " + (tab === "proceso" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-pressed={tab === "proceso"}
          >
            <Network className="h-4 w-4" />
            Por proceso
          </button>
          <button
            type="button"
            onClick={() => setTab("documento")}
            className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " + (tab === "documento" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-pressed={tab === "documento"}
          >
            <FileText className="h-4 w-4" />
            Por documento
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTranspuesta((t) => !t)}
            className={"inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " + (transpuesta ? "border-primary/40 bg-primary/5 text-foreground" : "border-border bg-card hover:bg-muted/50")}
            aria-pressed={transpuesta}
            title="Intercambiar filas y columnas"
          >
            <FlipHorizontal2 className="h-4 w-4" />
            Trasponer
          </button>
          <button
            type="button"
            onClick={exportarExcel}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportarPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <Printer className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="raci-no-print mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(RACI_META) as Array<keyof typeof RACI_META>)
          .filter((k) => k !== "C") /* C no se usa hoy; se mostrará cuando exista el dato */
          .map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-medium"
                style={{ backgroundColor: RACI_META[k].bg, color: RACI_META[k].fg }}
              >
                {k}
              </span>
              {RACI_META[k].label}
            </span>
          ))}
      </div>

      {/* Zona imprimible */}
      <div id="raci-print">
        <h2 className="mb-3 hidden font-serif text-lg font-semibold print:block">{titulo}</h2>
        <MatrizRaciTabla matriz={matriz} etiquetaColumna={etiquetaColumna} transpuesta={transpuesta} />
      </div>

      <p className="raci-no-print mt-4 rounded-lg border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
        La matriz Puesto × Proceso se deriva de los roles de cada puesto en los procesos
        (aprobador → A, elaborador → R, lector → I). La de Puesto × Documento se arma con los
        elaboradores (R) y los aprobadores (A) de cada documento. Cuando un puesto tiene más de un
        rol, se muestra el más alto (A &gt; R &gt; I). Exportá a Excel para trabajarla, o a PDF para el
        legajo de auditoría.
      </p>
    </div>
  );
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
