"use client";

import { useState } from "react";
import { ChevronRight, Pencil, AlertTriangle, Paperclip, FileText, Activity, Lightbulb, Shield, ShieldCheck, ShieldHalf, Link2, Minus } from "lucide-react";
import type { NodoProcesoRiesgo, RiesgoArbol, MitiganteRiesgo } from "@/lib/api/riesgos";
import {
  clasificarNumerico,
  GRADO_CONTROL_LABEL,
  MADUREZ_CONTROL_LABEL,
  type NivelRiesgo,
  type GradoControl,
  type MadurezControl,
} from "@/lib/riesgos-utils";

// Semáforo de 4 niveles, coherente con clasificarNivel (mismos cortes que el
// resto del módulo). El color sale del RESIDUAL, no del inherente.
const NIVEL: Record<NivelRiesgo, { punto: string; texto: string; label: string }> = {
  bajo: { punto: "#059669", texto: "#047857", label: "Bajo" },
  medio: { punto: "#d97706", texto: "#b45309", label: "Medio" },
  alto: { punto: "#ea580c", texto: "#c2410c", label: "Alto" },
  extremo: { punto: "#e11d48", texto: "#be123c", label: "Extremo" },
};

// Sin evaluar: ausencia de grado de control. No es verde — gris neutro.
const SIN_EVALUAR = { punto: "#94a3b8", texto: "#64748b", label: "Sin evaluar" };

function nivelDeResidual(n: number): NivelRiesgo {
  return clasificarNumerico(n);
}

// Un riesgo "sin evaluar" es el que no tiene grado de control cargado.
function sinEvaluar(r: RiesgoArbol): boolean {
  return r.gradoControl == null;
}

// ¿El nodo de proceso merece atención? Peor residual en nivel extremo.
function esUrgente(nodo: NodoProcesoRiesgo): boolean {
  return nodo.totalRiesgos > 0 && nivelDeResidual(nodo.peorResidual) === "extremo";
}

function tieneUrgenteDebajo(nodo: NodoProcesoRiesgo): boolean {
  if (esUrgente(nodo)) return true;
  return nodo.hijos.some(tieneUrgenteDebajo);
}

function SemaforoProc({ nodo }: { nodo: NodoProcesoRiesgo }) {
  // Proceso sin riesgos: punto hueco (no hay nada que evaluar todavía).
  if (nodo.totalRiesgos === 0) {
    return (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{ borderColor: "#cbd5e1" }}
        aria-hidden="true"
      />
    );
  }
  const c = NIVEL[nivelDeResidual(nodo.peorResidual)];
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: c.punto }}
      aria-hidden="true"
    />
  );
}

// Color del semáforo de madurez del control: de rojo (no existe metodología)
// a verde (control total / no requiere). Independiente del residual.
const MADUREZ_COLOR: Record<Exclude<MadurezControl, null>, string> = {
  no_existe: "#e11d48",
  no_escritas: "#ea580c",
  parcial_procedimientos: "#d97706",
  parcial_monitoreos: "#f59e0b",
  total: "#059669",
  no_requiere: "#10b981",
};

// Ícono/círculo de color para la madurez del control, con el texto completo en
// el tooltip. Si no hay madurez cargada, círculo gris neutro.
function IconoMadurez({ m }: { m: MadurezControl }) {
  if (m == null) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "#f1efe8" }}
        title="Madurez del control: sin evaluar"
      >
        <Shield className="h-3 w-3" style={{ color: "#888780" }} aria-hidden="true" />
      </span>
    );
  }
  const color = MADUREZ_COLOR[m];
  const Icono = m === "total" || m === "no_requiere" ? ShieldCheck : ShieldHalf;
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}22` }}
      title={`Madurez del control: ${MADUREZ_CONTROL_LABEL[m]}`}
    >
      <Icono className="h-3 w-3" style={{ color }} aria-hidden="true" />
    </span>
  );
}

// Indicador simple de si el riesgo tiene mitigante (texto de tratamiento o
// vínculo estructurado): clip encendido (verde) vs. guion apagado (gris).
function IndicadorMitigante({ tiene }: { tiene: boolean }) {
  return (
    <span
      className="flex w-4 shrink-0 items-center justify-center"
      title={tiene ? "Tiene mitigante" : "Sin mitigante"}
    >
      {tiene ? (
        <Link2 className="h-4 w-4" style={{ color: "#0f766e" }} aria-hidden="true" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
      )}
    </span>
  );
}

function BadgeResidual({ r }: { r: RiesgoArbol }) {
  if (sinEvaluar(r)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ backgroundColor: "#f1f5f9", color: SIN_EVALUAR.texto }}
        title="Sin grado de control cargado: el riesgo no fue evaluado todavía"
      >
        Sin evaluar ({r.inherente})
      </span>
    );
  }
  const nivel = nivelDeResidual(r.residualNum);
  const c = NIVEL[nivel];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${c.punto}1a`, color: c.texto }}
      title={`Residual ${c.label} (inherente ${r.inherente} → residual ${r.residualNum})`}
    >
      {c.label} ({r.residualNum})
    </span>
  );
}

function ListaVinculos({ items }: { items: MitiganteRiesgo[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <span className="font-semibold uppercase tracking-wider text-muted-foreground/70">Vínculos</span>
      <ul className="mt-1 space-y-1">
        {items.map((m) => {
          if (m.tipo === "documento" && m.documentoCodigo) {
            return (
              <li key={m.id}>
                <a
                  href={`/documentos/${m.documentoId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[11px]">{m.documentoCodigo}</span>
                  {m.documentoTitulo && <span className="text-foreground/80">· {m.documentoTitulo}</span>}
                </a>
              </li>
            );
          }
          if (m.tipo === "indicador" && m.indicadorCodigo) {
            return (
              <li key={m.id}>
                <a
                  href={`/indicadores/${m.indicadorId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[11px]">{m.indicadorCodigo}</span>
                  {m.indicadorNombre && <span className="text-foreground/80">· {m.indicadorNombre}</span>}
                </a>
              </li>
            );
          }
          // tipo "otro": control sin vínculo a documento/indicador
          return (
            <li key={m.id} className="inline-flex items-center gap-1.5 text-foreground/80">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {m.descripcion || "Control sin referencia"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Fila de un riesgo dentro de un proceso. Expandible: muestra causa /
// consecuencia / mitigante, que en la tabla de carga no se ven.
function FilaRiesgo({ r, padLeft, forzarAbierto, vinculos }: { r: RiesgoArbol; padLeft: number; forzarAbierto: boolean; vinculos: MitiganteRiesgo[] }) {
  const [abierto, setAbierto] = useState(forzarAbierto);
  const nVinculos = vinculos.length;
  const tieneDetalle = !!(r.causa || r.consecuencia || r.mitigante) || nVinculos > 0;
  const desestimado = r.gradoControl === "desestimado_gerencia";

  return (
    <div>
      <div
        className={
          "flex items-center gap-3 border-b border-border py-2 text-sm transition-colors " +
          (tieneDetalle ? "cursor-pointer select-none hover:bg-muted/40" : "")
        }
        style={{ paddingLeft: padLeft, paddingRight: 16 }}
        onClick={tieneDetalle ? () => setAbierto((v) => !v) : undefined}
        role={tieneDetalle ? "button" : undefined}
        aria-expanded={tieneDetalle ? abierto : undefined}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {tieneDetalle ? (
            <ChevronRight className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")} aria-hidden="true" />
          ) : null}
        </span>

        {r.categoria === "oportunidad" ? (
          <span title="Tipo: Oportunidad" className="flex shrink-0">
            <Lightbulb className="h-4 w-4 shrink-0" style={{ color: "#0f766e" }} aria-hidden="true" />
          </span>
        ) : (
          <span title="Tipo: Riesgo" className="flex shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#b91c1c" }} aria-hidden="true" />
          </span>
        )}

        <span className="flex-1 truncate text-foreground/90" title={r.titulo}>
          {r.titulo}
        </span>

        {/* Grado de control como texto en columna (o "Aceptado" si desestimado). */}
        <span
          className="hidden w-28 shrink-0 truncate text-right text-xs text-muted-foreground sm:inline-block"
          title={
            r.gradoControl
              ? `Grado de control: ${GRADO_CONTROL_LABEL[r.gradoControl]}`
              : "Grado de control: sin evaluar"
          }
        >
          {desestimado
            ? "Aceptado gerencia"
            : r.gradoControl
              ? GRADO_CONTROL_LABEL[r.gradoControl]
              : "—"}
        </span>

        {/* Madurez del control: ícono de color con tooltip. */}
        <IconoMadurez m={r.madurezControl} />

        {/* Mitigante sí/no (texto de tratamiento o vínculo estructurado). */}
        <IndicadorMitigante tiene={r.tieneMitigante} />

        {/* Riesgo residual. */}
        <span className="flex w-[92px] shrink-0 justify-end">
          <BadgeResidual r={r} />
        </span>

        {/* Navega a /riesgos?riesgo=<id> con recarga real (<a>): el wrapper se
            remonta en "tabla" y GestionRiesgos abre el modal de edición.
            stopPropagation evita que el clic también expanda/colapse la fila. */}
        <a
          href={`/riesgos?riesgo=${r.id}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Abrir riesgo"
          aria-label={`Abrir ${r.codigo}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      {tieneDetalle && abierto && (
        <div
          className="space-y-2 border-b border-border bg-muted/20 py-3 text-xs"
          style={{ paddingLeft: padLeft + 38, paddingRight: 16 }}
        >
          <ListaVinculos items={vinculos} />
          {r.causa && (
            <div>
              <span className="font-semibold uppercase tracking-wider text-muted-foreground/70">Causa</span>
              <p className="mt-0.5 text-foreground/90">{r.causa}</p>
            </div>
          )}
          {r.consecuencia && (
            <div>
              <span className="font-semibold uppercase tracking-wider text-muted-foreground/70">Consecuencia</span>
              <p className="mt-0.5 text-foreground/90">{r.consecuencia}</p>
            </div>
          )}
          {r.mitigante && (
            <div>
              <span className="font-semibold uppercase tracking-wider text-muted-foreground/70">Mitigante</span>
              <p className="mt-0.5 text-foreground/90">{r.mitigante}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            <span>
              Inherente: <span className="font-mono text-foreground/80">{r.probabilidad}×{r.impacto}={r.inherente}</span>
            </span>
            <span>
              Control:{" "}
              <span className="text-foreground/80">
                {r.gradoControl ? GRADO_CONTROL_LABEL[r.gradoControl as Exclude<GradoControl, null>] : "Sin evaluar"}
              </span>
            </span>
            <span>
              Residual: <span className="font-mono text-foreground/80">{r.residualNum}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Fila de un proceso. Se despliega mostrando subprocesos (si los hay) y riesgos.
function FilaProceso({ nodo, depth, forzarAbierto, mitigantesPorRiesgo }: { nodo: NodoProcesoRiesgo; depth: number; forzarAbierto: boolean; mitigantesPorRiesgo: Record<string, MitiganteRiesgo[]> }) {
  const tieneHijos = nodo.hijos.length > 0;
  const tieneRiesgos = nodo.riesgos.length > 0;
  const expandible = tieneHijos || tieneRiesgos;
  const [abierto, setAbierto] = useState(forzarAbierto);

  const urgente = esUrgente(nodo);
  const colapsadoConUrgencia = !abierto && tieneHijos && tieneUrgenteDebajo(nodo);
  const padLeft = 16 + depth * 20;

  const cTexto =
    nodo.totalRiesgos === 0 ? SIN_EVALUAR.texto : NIVEL[nivelDeResidual(nodo.peorResidual)].texto;

  return (
    <div>
      <div
        className={
          "flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors " +
          (urgente ? "bg-rose-50/60 " : "hover:bg-muted/40 ") +
          (expandible ? "cursor-pointer select-none" : "")
        }
        style={{
          paddingLeft: padLeft,
          boxShadow: urgente ? "inset 3px 0 0 0 #e11d48" : undefined,
        }}
        onClick={expandible ? () => setAbierto((v) => !v) : undefined}
        role={expandible ? "button" : undefined}
        aria-expanded={expandible ? abierto : undefined}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {expandible ? (
            <ChevronRight className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")} aria-hidden="true" />
          ) : null}
        </span>

        <SemaforoProc nodo={nodo} />

        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground sm:w-20">{nodo.codigo}</span>

        <span
          className={"flex-1 truncate text-sm " + (depth === 0 ? "font-medium text-foreground" : "text-foreground/90")}
          title={nodo.nombre}
        >
          {nodo.nombre}
          {colapsadoConUrgencia && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-medium text-rose-600">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              riesgo extremo debajo
            </span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {nodo.totalRiesgos} {nodo.totalRiesgos === 1 ? "riesgo" : "riesgos"}
          </span>
          {nodo.totalRiesgos > 0 && (
            <span className="w-20 text-right text-[11px] font-medium" style={{ color: cTexto }}>
              peor: {NIVEL[nivelDeResidual(nodo.peorResidual)].label}
            </span>
          )}
        </div>
      </div>

      {abierto && tieneHijos && (
        <div>
          {nodo.hijos.map((h) => (
            <FilaProceso key={h.procesoId} nodo={h} depth={depth + 1} forzarAbierto={forzarAbierto} mitigantesPorRiesgo={mitigantesPorRiesgo} />
          ))}
        </div>
      )}

      {abierto && tieneRiesgos && (
        <div>
          {nodo.riesgos.map((r) => (
            <FilaRiesgo key={r.id} r={r} padLeft={padLeft + 20} forzarAbierto={forzarAbierto} vinculos={mitigantesPorRiesgo[r.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArbolRiesgos({ raices, mitigantesPorRiesgo }: { raices: NodoProcesoRiesgo[]; mitigantesPorRiesgo: Record<string, MitiganteRiesgo[]> }) {
  const [todoAbierto, setTodoAbierto] = useState(false);

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
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* key fuerza re-montaje al togglear, para que cada fila relea su estado inicial */}
        <div key={todoAbierto ? "open" : "closed"}>
          {raices.map((n) => (
            <FilaProceso key={n.procesoId} nodo={n} depth={0} forzarAbierto={todoAbierto} mitigantesPorRiesgo={mitigantesPorRiesgo} />
          ))}
        </div>
      </div>

      {/* Referencias */}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referencias</p>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Nivel de riesgo residual
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NIVEL.bajo.punto }} /> Bajo (≤4)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NIVEL.medio.punto }} /> Medio (5–9)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NIVEL.alto.punto }} /> Alto (10–15)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NIVEL.extremo.punto }} /> Extremo (≥16)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SIN_EVALUAR.punto }} /> Sin evaluar (sin grado de control)
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-1 rounded-sm" style={{ backgroundColor: "#e11d48" }} />
            Franja roja — riesgo extremo en el proceso
          </span>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          El nivel residual surge del riesgo inherente (probabilidad × impacto) modulado por el grado de control:
          control total reduce a un cuarto, control parcial a la mitad, sin control no reduce. “Desestimado por gerencia”
          tampoco reduce, pero se marca aparte porque es un riesgo aceptado conscientemente, no descuidado. Cada proceso
          toma el peor riesgo residual de los suyos (no el promedio): en gestión de riesgos manda el más expuesto. Un
          riesgo sin grado de control cargado aparece como “sin evaluar” en gris, nunca en verde.
        </p>
      </div>
    </div>
  );
}
