"use client";

import { useState } from "react";
import type { MatrizRaci, RaciValor } from "@/lib/api/raci";

const RACI_META: Record<Exclude<RaciValor, null>, { bg: string; fg: string; label: string }> = {
  A: { bg: "#F5C4B3", fg: "#993C1D", label: "Aprueba" },
  R: { bg: "#9FE1CB", fg: "#0F6E56", label: "Ejecuta" },
  C: { bg: "#FAC775", fg: "#854F0B", label: "Consultado" },
  I: { bg: "#E6F1FB", fg: "#185FA5", label: "Informado" },
};

type Eje = { clave: string; titulo: string; etiquetaCorta: string };

export function MatrizRaciTabla({
  matriz,
  etiquetaColumna,
  transpuesta = false,
}: {
  matriz: MatrizRaci;
  etiquetaColumna: string;
  transpuesta?: boolean;
}) {
  const [sel, setSel] = useState<string | null>(null);

  if (matriz.puestos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay datos para esta matriz todavía.
      </div>
    );
  }

  // Ejes según orientación.
  const ejePuestos: Eje[] = matriz.puestos.map((p) => ({ clave: p, titulo: p, etiquetaCorta: p }));
  const ejeColumnas: Eje[] = matriz.columnas.map((c) => ({ clave: c.codigo, titulo: c.etiqueta, etiquetaCorta: c.codigo }));

  // En la orientación normal: filas = puestos, columnas = procesos/docs.
  // Transpuesta: filas = procesos/docs, columnas = puestos.
  const filas = transpuesta ? ejeColumnas : ejePuestos;
  const cols = transpuesta ? ejePuestos : ejeColumnas;

  // Lee la celda RACI sea cual sea la orientación.
  function valor(filaClave: string, colClave: string): RaciValor {
    const puesto = transpuesta ? colClave : filaClave;
    const columna = transpuesta ? filaClave : colClave;
    return matriz.celdas[puesto]?.[columna] ?? null;
  }

  // La primera columna (encabezado de fila). Cuando las filas son puestos, es
  // texto largo y va sin truncar; cuando son procesos/docs, va con su código.
  const filasSonPuestos = !transpuesta;
  const sujeto = filasSonPuestos ? "puesto" : etiquetaColumna.replace(/s$/, "");

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {matriz.puestos.length} puestos · {matriz.columnas.length} {etiquetaColumna}. Tocá un{filasSonPuestos ? "" : "a"} {sujeto} para resaltar su fila.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-20 border-b border-r border-border bg-muted/60 px-3 py-2 text-left font-medium"
                style={{ minWidth: filasSonPuestos ? 180 : 130 }}
              >
                {filasSonPuestos ? "Puesto" : etiquetaColumna.charAt(0).toUpperCase() + etiquetaColumna.slice(1, -1)}
              </th>
              {cols.map((c) => (
                <th
                  key={c.clave}
                  title={c.titulo}
                  className={
                    "border-b border-border bg-muted/40 py-2 text-center font-normal text-muted-foreground " +
                    (transpuesta ? "px-2 text-[10px]" : "px-1.5 font-mono text-[10px]")
                  }
                  style={{ minWidth: transpuesta ? 60 : 46, maxWidth: transpuesta ? 92 : undefined }}
                >
                  {transpuesta ? (
                    <span className="block truncate" title={c.titulo}>{c.etiquetaCorta}</span>
                  ) : (
                    c.etiquetaCorta
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const dim = sel && sel !== f.clave;
              const activo = sel === f.clave;
              return (
                <tr
                  key={f.clave}
                  onClick={() => setSel(activo ? null : f.clave)}
                  className="cursor-pointer transition-opacity"
                  style={{ opacity: dim ? 0.3 : 1 }}
                >
                  <td
                    className={"sticky left-0 z-10 border-b border-r border-border px-3 py-1.5 " + (activo ? "bg-primary/10 font-medium" : "bg-card")}
                    style={{ whiteSpace: "nowrap" }}
                    title={f.titulo}
                  >
                    {filasSonPuestos ? (
                      f.etiquetaCorta
                    ) : (
                      <span className="font-mono text-[11px]">{f.etiquetaCorta}</span>
                    )}
                  </td>
                  {cols.map((c) => {
                    const v = valor(f.clave, c.clave);
                    return (
                      <td key={c.clave} className="border-b border-border px-1.5 py-1.5 text-center">
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
