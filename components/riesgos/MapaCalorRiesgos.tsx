"use client";

import { useState, useMemo } from "react";
import { Pencil, ShieldAlert, TrendingUp } from "lucide-react";
import type { Riesgo } from "@/lib/api/riesgos";
import {
  clasificarNumerico, residual,
  type NivelRiesgo, type GradoControl,
} from "@/lib/riesgos-utils";

type Modo = "inherente" | "residual";

const NIVEL_CELDA: Record<NivelRiesgo, { fill: string; texto: string; label: string }> = {
  bajo: { fill: "#9FE1CB", texto: "#0F6E56", label: "Bajo" },
  medio: { fill: "#FAC775", texto: "#854F0B", label: "Medio" },
  alto: { fill: "#F0997B", texto: "#993C1D", label: "Alto" },
  extremo: { fill: "#F09595", texto: "#A32D2D", label: "Extremo" },
};

// Para el modo residual: cada riesgo se reubica en la celda P×I que corresponde
// a su residual. Mantenemos el impacto y recalculamos la probabilidad efectiva
// para que el número del residual coincida con la celda (P_efectiva × I = residual).
function celdaDe(r: Riesgo, modo: Modo): { p: number; i: number; valor: number } {
  if (modo === "inherente") {
    return { p: r.probabilidad, i: r.impacto, valor: r.probabilidad * r.impacto };
  }
  const gc = r.gradoControl as GradoControl;
  const res = residual(r.probabilidad, r.impacto, gc).numerico;
  // Reubicación: conservamos impacto, ajustamos probabilidad para reflejar la reducción.
  const pEf = Math.max(1, Math.min(5, Math.round(res / r.impacto) || 1));
  return { p: pEf, i: r.impacto, valor: res };
}

export default function MapaCalorRiesgos({ riesgos }: { riesgos: Riesgo[] }) {
  const [modo, setModo] = useState<Modo>("inherente");
  const [celdaSel, setCeldaSel] = useState<string | null>(null);

  // Solo riesgos (las oportunidades no van al mapa de calor de riesgos).
  const soloRiesgos = useMemo(
    () => riesgos.filter((r) => r.categoria === "riesgo"),
    [riesgos],
  );

  // Agrupar por celda según el modo.
  const porCelda = useMemo(() => {
    const m = new Map<string, Riesgo[]>();
    for (const r of soloRiesgos) {
      // En residual, un riesgo sin grado de control no está evaluado: lo dejamos
      // en su celda inherente pero lo marcaremos como "sin evaluar" en el detalle.
      const { p, i } = celdaDe(r, modo);
      const key = `${p}-${i}`;
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [soloRiesgos, modo]);

  const sinEvaluar = useMemo(
    () => (modo === "residual" ? soloRiesgos.filter((r) => r.gradoControl == null).length : 0),
    [soloRiesgos, modo],
  );

  const riesgosCelda = celdaSel ? porCelda.get(celdaSel) ?? [] : [];

  return (
    <div>
      {/* Toggle inherente / residual */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
          {(["inherente", "residual"] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setModo(m); setCeldaSel(null); }}
              className={
                "rounded-md px-3 py-1.5 font-medium capitalize transition-colors " +
                (modo === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")
              }
              aria-pressed={modo === m}
            >
              {m === "inherente" ? "Inherente" : "Residual"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {modo === "inherente"
            ? "Riesgo en bruto: probabilidad × impacto."
            : "Riesgo después del grado de control."}
        </p>
      </div>

      {modo === "residual" && sinEvaluar > 0 && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sinEvaluar} riesgo{sinEvaluar !== 1 ? "s" : ""} sin grado de control cargado: en el residual se ubican
          igual que en su nivel inherente hasta que se clasifiquen.
        </p>
      )}

      {/* Matriz 5×5 */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-2" style={{ minWidth: 420 }}>
          {/* Eje Y (impacto) */}
          <div
            className="flex flex-col justify-around pb-7 text-xs text-muted-foreground"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 320 }}
          >
            Impacto →
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-5 gap-1.5">
              {[5, 4, 3, 2, 1].map((iVal) =>
                [1, 2, 3, 4, 5].map((pVal) => {
                  const key = `${pVal}-${iVal}`;
                  const lista = porCelda.get(key) ?? [];
                  const n = lista.length;
                  const nivel = clasificarNumerico(pVal * iVal);
                  const meta = NIVEL_CELDA[nivel];
                  const sel = celdaSel === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={n === 0}
                      onClick={() => setCeldaSel(sel ? null : key)}
                      title={`P${pVal} × I${iVal} = ${pVal * iVal} · ${n} riesgo${n !== 1 ? "s" : ""}`}
                      className={
                        "flex aspect-square flex-col items-center justify-center rounded-md transition-all " +
                        (n === 0 ? "cursor-default border border-dashed border-border bg-card" : "cursor-pointer hover:opacity-90") +
                        (sel ? " ring-2 ring-foreground ring-offset-1" : "")
                      }
                      style={n > 0 ? { backgroundColor: meta.fill } : undefined}
                    >
                      <span
                        className="text-xl font-semibold"
                        style={{ color: n > 0 ? meta.texto : "var(--muted-foreground, #94a3b8)" }}
                      >
                        {n > 0 ? n : "·"}
                      </span>
                      {n > 0 && <span className="text-[10px]" style={{ color: meta.texto }}>{meta.label}</span>}
                    </button>
                  );
                }),
              )}
            </div>
            {/* Eje X (probabilidad) */}
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((p) => (
                <div key={p} className="text-center text-xs text-muted-foreground">{p}</div>
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">Probabilidad →</p>
          </div>
        </div>
      </div>

      {/* Detalle de la celda seleccionada */}
      {celdaSel && riesgosCelda.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-medium">
              {riesgosCelda.length} riesgo{riesgosCelda.length !== 1 ? "s" : ""} en esta celda
            </p>
            <button
              type="button"
              onClick={() => setCeldaSel(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
          <div>
            {riesgosCelda.map((r) => {
              const inh = r.probabilidad * r.impacto;
              const res = residual(r.probabilidad, r.impacto, r.gradoControl as GradoControl).numerico;
              return (
                <div key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0">
                  {r.categoria === "oportunidad"
                    ? <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    : <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground" title={r.codigo}>{r.codigo}</span>
                  <span className="flex-1 truncate" title={r.titulo}>{r.titulo}</span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {modo === "inherente" ? `inh ${inh}` : `res ${res}`}
                  </span>
                  <a
                    href={`/riesgos?riesgo=${r.id}`}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Editar riesgo"
                    aria-label={`Editar ${r.codigo}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referencias */}
      <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niveles</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {(["bajo", "medio", "alto", "extremo"] as NivelRiesgo[]).map((nv) => (
            <span key={nv} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: NIVEL_CELDA[nv].fill }} />
              {NIVEL_CELDA[nv].label}
            </span>
          ))}
        </div>
        <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Cada celda agrupa los riesgos con esa combinación de probabilidad e impacto. Tocá una celda para ver
          sus riesgos y editarlos. En modo residual, cada riesgo se reubica según el efecto de su grado de
          control (mismo cálculo que la vista por proceso).
        </p>
      </div>
    </div>
  );
}
