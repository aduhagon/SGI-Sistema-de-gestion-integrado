"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import type { NodoCumplimiento } from "@/lib/api/matriz";

// Umbrales del semáforo (acordados con O&M):
//   rojo  < 50%   → hueco serio, mirar primero
//   ámbar 50–84%  → parcial, en progreso
//   verde ≥ 85%   → cubierto a nivel auditable
type Estado = "rojo" | "ambar" | "verde";

function estadoDe(pct: number): Estado {
  if (pct < 50) return "rojo";
  if (pct < 85) return "ambar";
  return "verde";
}

const SEMAFORO: Record<Estado, { punto: string; barra: string; texto: string }> = {
  rojo: { punto: "#e11d48", barra: "#e11d48", texto: "#be123c" },
  ambar: { punto: "#d97706", barra: "#d97706", texto: "#b45309" },
  verde: { punto: "#059669", barra: "#059669", texto: "#047857" },
};

const COLOR_COBERTURA: Record<string, string> = {
  total: "#059669",
  parcial: "#d97706",
  referencia: "#0284c7",
};

/** ¿Este nodo merece llamar la atención (glow)? Solo rojos críticos. */
function esUrgente(nodo: NodoCumplimiento): boolean {
  return nodo.esCritico && estadoDe(nodo.pctCumplimiento) === "rojo";
}

/** ¿Algún descendiente es urgente? Para marcar padres colapsados. */
function tieneUrgenteDebajo(nodo: NodoCumplimiento): boolean {
  if (esUrgente(nodo)) return true;
  return nodo.hijos.some(tieneUrgenteDebajo);
}

function Semaforo({ pct }: { pct: number }) {
  const c = SEMAFORO[estadoDe(pct)];
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: c.punto }}
      aria-hidden="true"
    />
  );
}

function BarraPct({ pct }: { pct: number }) {
  const c = SEMAFORO[estadoDe(pct)];
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:w-28">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: c.barra }}
      />
    </div>
  );
}

function Fila({
  nodo,
  depth,
  forzarAbierto,
}: {
  nodo: NodoCumplimiento;
  depth: number;
  forzarAbierto: boolean;
}) {
  const tieneHijos = nodo.hijos.length > 0;
  // Estado inicial: si "Expandir todo" está activo, abierto; si no, abrir los
  // nodos raíz que tengan una urgencia debajo (el ojo va directo al problema).
  const [abierto, setAbierto] = useState<boolean>(
    forzarAbierto || (depth === 0 && tieneUrgenteDebajo(nodo)),
  );

  const pct = nodo.pctCumplimiento;
  const c = SEMAFORO[estadoDe(pct)];
  const urgente = esUrgente(nodo);
  const colapsadoConUrgencia = !abierto && tieneHijos && tieneUrgenteDebajo(nodo);

  const padLeft = 16 + depth * 20;

  return (
    <div>
      <div
        className={
          "flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors " +
          (urgente ? "bg-rose-50/60 " : "hover:bg-muted/40 ") +
          (tieneHijos ? "cursor-pointer select-none" : "")
        }
        style={{
          paddingLeft: padLeft,
          // Glow solo en urgentes: resplandor sutil que rompe el patrón neutro.
          boxShadow: urgente ? "inset 3px 0 0 0 #e11d48" : undefined,
        }}
        onClick={tieneHijos ? () => setAbierto((v) => !v) : undefined}
        role={tieneHijos ? "button" : undefined}
        aria-expanded={tieneHijos ? abierto : undefined}
      >
        {/* Chevron / espaciador */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {tieneHijos ? (
            <ChevronRight
              className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")}
              aria-hidden="true"
            />
          ) : null}
        </span>

        <Semaforo pct={pct} />

        {/* Cláusula */}
        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground sm:w-16">
          {nodo.clausula}
        </span>

        {/* Título */}
        <span
          className={
            "flex-1 truncate text-sm " +
            (depth === 0 ? "font-medium text-foreground" : "text-foreground/90")
          }
          title={nodo.titulo}
        >
          {nodo.titulo}
          {nodo.esCritico && (
            <span
              title="Requisito crítico"
              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 align-middle"
            />
          )}
          {colapsadoConUrgencia && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-medium text-rose-600">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              crítico sin cubrir
            </span>
          )}
        </span>

        {/* Magnitud + número (señal de respaldo, no protagonista) */}
        <div className="flex shrink-0 items-center gap-2.5">
          <BarraPct pct={pct} />
          <span
            className="w-12 text-right font-mono text-xs tabular-nums"
            style={{ color: c.texto }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Hijos */}
      {tieneHijos && abierto && (
        <div>
          {nodo.hijos.map((h) => (
            <Fila key={h.requisitoId} nodo={h} depth={depth + 1} forzarAbierto={forzarAbierto} />
          ))}
        </div>
      )}

      {/* Documentos que cubren una hoja: se muestran al abrir su fila padre */}
      {!tieneHijos && nodo.coberturas.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 border-b border-border bg-muted/20 py-2"
          style={{ paddingLeft: padLeft + 38 }}
        >
          {nodo.coberturas.map((cob) => (
            <Link
              key={cob.documentoId}
              href={`/documentos/${cob.documentoId}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs hover:bg-muted/50"
              title={`${cob.titulo} · cobertura ${cob.tipoCobertura}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: COLOR_COBERTURA[cob.tipoCobertura] ?? "#475569" }}
              />
              <span className="font-mono">{cob.codigo}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArbolCumplimiento({
  raices,
}: {
  raices: NodoCumplimiento[];
}) {
  const [todoAbierto, setTodoAbierto] = useState(false);

  return (
    <div>
      {/* Control rápido + leyenda de referencias */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setTodoAbierto((v) => !v)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50"
        >
          {todoAbierto ? "Colapsar todo" : "Expandir todo"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* key fuerza re-montaje al togglear expandir/colapsar todo,
            de modo que cada Fila relea su estado inicial desde forzarAbierto */}
        <div key={todoAbierto ? "open" : "closed"}>
          {raices.map((n) => (
            <Fila key={n.requisitoId} nodo={n} depth={0} forzarAbierto={todoAbierto} />
          ))}
        </div>
      </div>

      {/* Referencias: explican cada señal visual para lectura sin asistencia */}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Referencias
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#e11d48" }} />
            Cumplimiento bajo — menos del 50%
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#d97706" }} />
            Parcial — entre 50% y 84%
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#059669" }} />
            Cubierto — 85% o más
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Requisito crítico
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-1 rounded-sm" style={{ backgroundColor: "#e11d48" }} />
            Franja roja a la izquierda — crítico sin cubrir (mirar primero)
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-foreground/70">4 ▸ 4.1</span>
            El % de un punto es el promedio de sus subpuntos
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Cada subpunto cuenta como cubierto (cobertura total), medio cubierto (parcial) o
          sin cubrir. Cuando un subpunto tiene varios documentos, se toma el de mayor
          cobertura: tener más documentos no eleva artificialmente el porcentaje.
        </p>
      </div>
    </div>
  );
}
