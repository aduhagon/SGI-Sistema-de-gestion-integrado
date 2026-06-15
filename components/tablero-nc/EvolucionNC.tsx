"use client";

import { useMemo } from "react";
import type { NCMes } from "@/lib/api/tableroNC";

/**
 * Gráfico de evolución mensual de NC: barras de abiertas (apertura) y cerradas
 * (cierre) por mes. SVG simple, sin librerías.
 */
export function EvolucionNC({ datos }: { datos: NCMes[] }) {
  const { maxValor, conDatos } = useMemo(() => {
    const max = Math.max(1, ...datos.map((d) => Math.max(d.abiertas, d.cerradas)));
    const con = datos.some((d) => d.abiertas > 0 || d.cerradas > 0);
    return { maxValor: max, conDatos: con };
  }, [datos]);

  if (!conDatos) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Todavía no hay suficiente historia para mostrar la evolución. El gráfico se
        irá llenando a medida que se registren y cierren no conformidades.
      </div>
    );
  }

  const W = 720;
  const H = 220;
  const padL = 32;
  const padB = 28;
  const padT = 12;
  const anchoUtil = W - padL - 12;
  const altoUtil = H - padB - padT;
  const n = datos.length;
  const grupoAncho = anchoUtil / n;
  const barAncho = Math.min(14, grupoAncho / 3);

  const yDe = (v: number) => padT + altoUtil - (v / maxValor) * altoUtil;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Abiertas (apertura)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Cerradas (cierre)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución mensual de no conformidades">
        {/* eje Y: líneas guía */}
        {[0, 0.5, 1].map((f) => {
          const v = Math.round(maxValor * f);
          const y = yDe(v);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{v}</text>
            </g>
          );
        })}
        {/* barras por mes */}
        {datos.map((d, i) => {
          const x0 = padL + i * grupoAncho + grupoAncho / 2;
          const mesCorto = d.mes.slice(5); // MM
          return (
            <g key={d.mes}>
              <rect
                x={x0 - barAncho - 1} y={yDe(d.abiertas)}
                width={barAncho} height={padT + altoUtil - yDe(d.abiertas)}
                className="fill-rose-400" rx={1}
              />
              <rect
                x={x0 + 1} y={yDe(d.cerradas)}
                width={barAncho} height={padT + altoUtil - yDe(d.cerradas)}
                className="fill-emerald-500" rx={1}
              />
              <text x={x0} y={H - padB + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {mesCorto}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
