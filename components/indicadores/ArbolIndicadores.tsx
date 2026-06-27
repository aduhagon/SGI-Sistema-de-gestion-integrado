"use client";

import { useState } from "react";
import { ChevronRight, Gauge, AlertTriangle } from "lucide-react";
import type { NodoProcesoIndicador, IndicadorArbol } from "@/lib/api/indicadores";
import type { CumplimientoEstado } from "@/lib/indicadores-utils";
import { SENTIDO_LABEL, PERIODICIDAD_LABEL } from "@/lib/indicadores-utils";

// Colores del estado de cumplimiento de meta.
const CUMPLIMIENTO: Record<Exclude<CumplimientoEstado, "sin_meta">, { punto: string; texto: string; label: string }> = {
  cumple: { punto: "#059669", texto: "#047857", label: "Cumple" },
  alerta: { punto: "#d97706", texto: "#b45309", label: "Alerta" },
  incumple: { punto: "#e11d48", texto: "#be123c", label: "Incumple" },
};

// Sin meta / sin medición: neutro. No medir no es incumplir.
const NEUTRO = { punto: "#94a3b8", texto: "#64748b", label: "Sin datos" };

function fmtValor(v: number | null, unidad: string | null): string {
  if (v === null) return "—";
  const n = Number.isInteger(v) ? v.toString() : v.toFixed(2);
  return unidad ? `${n} ${unidad}` : n;
}

function fmtPeriodo(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

// Porcentaje de cobertura → color del anillo.
function colorCobertura(medidos: number, total: number): string {
  if (total === 0) return "#cbd5e1";
  const pct = medidos / total;
  if (pct === 0) return "#cbd5e1";
  if (pct < 0.5) return "#d97706";
  if (pct < 1) return "#0284c7";
  return "#059669";
}

function tieneIncumpleDebajo(nodo: NodoProcesoIndicador): boolean {
  if (nodo.peorCumplimiento === "incumple") return true;
  return nodo.hijos.some(tieneIncumpleDebajo);
}

function ChipCumplimiento({ estado }: { estado: CumplimientoEstado }) {
  if (estado === "sin_meta") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ backgroundColor: "#f1f5f9", color: NEUTRO.texto }}
      >
        Sin datos
      </span>
    );
  }
  const c = CUMPLIMIENTO[estado];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${c.punto}1a`, color: c.texto }}
    >
      {c.label}
    </span>
  );
}

function FilaIndicador({ ind, padLeft }: { ind: IndicadorArbol; padLeft: number }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <div
        className="flex cursor-pointer select-none items-center gap-3 border-b border-border py-2 text-sm transition-colors hover:bg-muted/40"
        style={{ paddingLeft: padLeft, paddingRight: 16 }}
        onClick={() => setAbierto((v) => !v)}
        role="button"
        aria-expanded={abierto}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          <ChevronRight className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")} aria-hidden="true" />
        </span>
        <span className="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground" title={ind.codigo}>
          {ind.codigo}
        </span>
        <span className="flex-1 truncate text-foreground/90" title={ind.nombre}>
          {ind.nombre}
        </span>
        <span className="hidden w-28 shrink-0 truncate text-right text-xs text-muted-foreground sm:block">
          {ind.ultimoValor !== null ? fmtValor(ind.ultimoValor, ind.unidad) : "Sin medición"}
        </span>
        <ChipCumplimiento estado={ind.cumplimiento} />
      </div>

      {abierto && (
        <div
          className="space-y-2 border-b border-border bg-muted/20 py-3 text-xs"
          style={{ paddingLeft: padLeft + 38, paddingRight: 16 }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-muted-foreground">
            <span>Meta: <span className="text-foreground/80">{ind.meta !== null ? fmtValor(ind.meta, ind.unidad) : "sin definir"}</span></span>
            <span>Sentido: <span className="text-foreground/80">{SENTIDO_LABEL[ind.sentido] ?? ind.sentido}</span></span>
            <span>Periodicidad: <span className="text-foreground/80">{PERIODICIDAD_LABEL[ind.periodicidad] ?? ind.periodicidad}</span></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-muted-foreground">
            <span>
              Último: <span className="font-mono text-foreground/80">{fmtValor(ind.ultimoValor, ind.unidad)}</span>
              {ind.ultimoPeriodo && <span className="text-foreground/60"> ({fmtPeriodo(ind.ultimoPeriodo)})</span>}
            </span>
            <span>Mediciones: <span className="text-foreground/80">{ind.cantidadMediciones}</span></span>
            {ind.responsablePuestoNombre && (
              <span>Responsable: <span className="text-foreground/80">{ind.responsablePuestoNombre}</span></span>
            )}
          </div>
          <div className="pt-1">
            <a
              href={`/indicadores/${ind.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver indicador y cargar medición
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaProceso({ nodo, depth, forzarAbierto }: { nodo: NodoProcesoIndicador; depth: number; forzarAbierto: boolean }) {
  const tieneHijos = nodo.hijos.length > 0;
  const tieneIndicadores = nodo.indicadores.length > 0;
  const expandible = tieneHijos || tieneIndicadores;
  const [abierto, setAbierto] = useState(forzarAbierto);

  const padLeft = 16 + depth * 20;
  const incumple = nodo.peorCumplimiento === "incumple";
  const colapsadoConIncumple = !abierto && tieneHijos && tieneIncumpleDebajo(nodo);

  // Semáforo del proceso: si hay cumplimiento real, manda el peor; si no, cobertura.
  const colorNodo =
    nodo.peorCumplimiento && nodo.peorCumplimiento !== "sin_meta"
      ? CUMPLIMIENTO[nodo.peorCumplimiento as Exclude<CumplimientoEstado, "sin_meta">].punto
      : colorCobertura(nodo.medidos, nodo.total);

  return (
    <div>
      <div
        className={
          "flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors " +
          (incumple ? "bg-rose-50/60 " : "hover:bg-muted/40 ") +
          (expandible ? "cursor-pointer select-none" : "")
        }
        style={{ paddingLeft: padLeft, boxShadow: incumple ? "inset 3px 0 0 0 #e11d48" : undefined }}
        onClick={expandible ? () => setAbierto((v) => !v) : undefined}
        role={expandible ? "button" : undefined}
        aria-expanded={expandible ? abierto : undefined}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {expandible ? (
            <ChevronRight className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")} aria-hidden="true" />
          ) : null}
        </span>

        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: colorNodo }}
          aria-hidden="true"
        />

        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground sm:w-20">{nodo.codigo}</span>

        <span className={"flex-1 truncate text-sm " + (depth === 0 ? "font-medium text-foreground" : "text-foreground/90")} title={nodo.nombre}>
          {nodo.nombre}
          {colapsadoConIncumple && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-medium text-rose-600">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              incumple debajo
            </span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {nodo.total} {nodo.total === 1 ? "indicador" : "indicadores"}
          </span>
          <span
            className="w-24 text-right text-[11px] font-medium"
            style={{ color: nodo.medidos === nodo.total && nodo.total > 0 ? "#047857" : "#64748b" }}
            title="Indicadores con al menos una medición cargada"
          >
            {nodo.medidos}/{nodo.total} medidos
          </span>
        </div>
      </div>

      {abierto && tieneHijos && (
        <div>
          {nodo.hijos.map((h) => (
            <FilaProceso key={h.procesoId} nodo={h} depth={depth + 1} forzarAbierto={forzarAbierto} />
          ))}
        </div>
      )}
      {abierto && tieneIndicadores && (
        <div>
          {nodo.indicadores.map((ind) => (
            <FilaIndicador key={ind.id} ind={ind} padLeft={padLeft + 20} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArbolIndicadores({ raices }: { raices: NodoProcesoIndicador[] }) {
  const [todoAbierto, setTodoAbierto] = useState(false);

  const totalIndicadores = raices.reduce((acc, n) => acc + n.total, 0);
  const totalMedidos = raices.reduce((acc, n) => acc + n.medidos, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setTodoAbierto((v) => !v)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50"
        >
          {todoAbierto ? "Colapsar todo" : "Expandir todo"}
        </button>
        <span className="text-xs text-muted-foreground">
          {totalMedidos}/{totalIndicadores} indicadores con mediciones
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div key={todoAbierto ? "open" : "closed"}>
          {raices.map((n) => (
            <FilaProceso key={n.procesoId} nodo={n} depth={0} forzarAbierto={todoAbierto} />
          ))}
        </div>
      </div>

      {/* Referencias */}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referencias</p>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Estado de cumplimiento (cuando hay mediciones)
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CUMPLIMIENTO.cumple.punto }} /> Cumple la meta</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CUMPLIMIENTO.alerta.punto }} /> En alerta (cerca de la meta)</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CUMPLIMIENTO.incumple.punto }} /> Incumple</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NEUTRO.punto }} /> Sin datos (sin meta o sin medición)</span>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Cada proceso muestra cuántos de sus indicadores tienen mediciones cargadas
          («X/Y medidos»). Mientras no haya mediciones, el punto es neutro y refleja la
          cobertura. Cuando hay indicadores medidos con meta, el punto toma el peor estado
          de cumplimiento del proceso (igual criterio que el árbol de riesgos: manda el más
          expuesto, no el promedio). Un indicador sin meta o sin medición no cuenta como
          incumplimiento; solo suma a la cobertura.
        </p>
      </div>
    </div>
  );
}
