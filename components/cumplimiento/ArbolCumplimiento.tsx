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
  // Nace comprimido: solo "Expandir todo" fuerza la apertura. El usuario
  // abre lo que necesita. Los padres colapsados con un crítico debajo igual
  // lo señalan (franja roja + badge), así que no hace falta auto-expandir.
  const [abierto, setAbierto] = useState<boolean>(forzarAbierto);

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

      {/* Documentos que cubren esta hoja: código + nombre + tipo de cobertura + estado */}
      {!tieneHijos && nodo.coberturas.length > 0 && (
        <div
          className="border-b border-border bg-muted/20 py-1.5"
          style={{ paddingLeft: padLeft + 38, paddingRight: 16 }}
        >
          {nodo.coberturas.map((cob) => (
            <Link
              key={cob.documentoId}
              href={`/documentos/${cob.documentoId}`}
              className="group flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-card"
            >
              {/* Tipo de cobertura */}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLOR_COBERTURA[cob.tipoCobertura] ?? "#475569" }}
                title={`Cobertura ${cob.tipoCobertura}`}
              />
              {/* Código */}
              <span className="shrink-0 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                {cob.codigo}
              </span>
              {/* Nombre del documento */}
              <span className="flex-1 truncate text-xs text-foreground/90" title={cob.titulo}>
                {cob.titulo}
              </span>
              {/* Estado del documento */}
              <EstadoDoc estado={cob.estadoDocumento} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const ESTADO_DOC: Record<string, { label: string; punto: string; texto: string }> = {
  aprobado: { label: "Vigente", punto: "#059669", texto: "#047857" },
  pendiente_aprobacion: { label: "En aprobación", punto: "#d97706", texto: "#b45309" },
  borrador: { label: "Borrador", punto: "#64748b", texto: "#475569" },
};

function EstadoDoc({ estado }: { estado: string }) {
  const e = ESTADO_DOC[estado] ?? {
    label: estado,
    punto: "#64748b",
    texto: "#475569",
  };
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
      style={{ color: e.texto }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.punto }} />
      {e.label}
    </span>
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
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Referencias
        </p>

        {/* Estado de cumplimiento del punto */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Cumplimiento del punto
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

        {/* Documentos que cubren cada subpunto */}
        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Documentos que lo cubren
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_COBERTURA.total }} />
            Cobertura total
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_COBERTURA.parcial }} />
            Cobertura parcial
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_COBERTURA.referencia }} />
            Referencia
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ESTADO_DOC.aprobado.punto }} />
            Vigente · {""}
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ESTADO_DOC.pendiente_aprobacion.punto }} />
            En aprobación · {""}
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ESTADO_DOC.borrador.punto }} />
            Borrador
          </span>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Cada subpunto cuenta como cubierto (cobertura total), medio cubierto (parcial) o
          sin cubrir. Cuando un subpunto tiene varios documentos, se toma el de mayor
          cobertura: tener más documentos no eleva artificialmente el porcentaje. Un
          documento en borrador o en aprobación todavía no es evidencia vigente para auditoría.
        </p>
      </div>
    </div>
  );
}
