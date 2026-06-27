"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Pencil, ShieldAlert, TrendingUp } from "lucide-react";
import type { Riesgo } from "@/lib/api/riesgos";
import {
  clasificarNumerico, residual,
  type NivelRiesgo, type GradoControl,
} from "@/lib/riesgos-utils";

type Modo = "inherente" | "residual";

const NIVEL_META: Record<NivelRiesgo, { fill: string; texto: string; label: string; orden: number }> = {
  extremo: { fill: "#F09595", texto: "#A32D2D", label: "Extremo", orden: 0 },
  alto: { fill: "#F0997B", texto: "#993C1D", label: "Alto", orden: 1 },
  medio: { fill: "#FAC775", texto: "#854F0B", label: "Medio", orden: 2 },
  bajo: { fill: "#9FE1CB", texto: "#0F6E56", label: "Bajo", orden: 3 },
};
const ORDEN_NIVEL: NivelRiesgo[] = ["extremo", "alto", "medio", "bajo"];

// Nivel de un riesgo según el modo (inherente o residual).
function nivelDe(r: Riesgo, modo: Modo): NivelRiesgo {
  if (modo === "inherente") return clasificarNumerico(r.probabilidad * r.impacto);
  return residual(r.probabilidad, r.impacto, r.gradoControl as GradoControl).nivel;
}

type Bloque = { nivel: NivelRiesgo; value: number; riesgos: Riesgo[] };
type Rect = Bloque & { x: number; y: number; w: number; h: number };

// Squarified treemap (Bruls et al.): rectángulos de área proporcional al value.
function squarify(items: Bloque[], W: number, H: number): Rect[] {
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const area = items.map((d) => ({ ...d, a: (d.value / total) * W * H }));
  const out: Rect[] = [];
  let rx = 0, ry = 0, rw = W, rh = H;

  const worst = (row: typeof area, len: number) => {
    const s = row.reduce((a, b) => a + b.a, 0);
    const max = Math.max(...row.map((r) => r.a));
    const min = Math.min(...row.map((r) => r.a));
    return Math.max((len * len * max) / (s * s), (s * s) / (len * len * min));
  };

  let i = 0;
  while (i < area.length) {
    const vertical = rw >= rh;
    const len = vertical ? rh : rw;
    let row = [area[i]]; i++;
    while (i < area.length) {
      const test = row.concat(area[i]);
      if (worst(test, len) <= worst(row, len)) { row.push(area[i]); i++; } else break;
    }
    const s = row.reduce((a, b) => a + b.a, 0);
    const thick = s / len;
    let off = 0;
    for (const c of row) {
      const cl = c.a / thick;
      if (vertical) out.push({ nivel: c.nivel, value: c.value, riesgos: c.riesgos, x: rx, y: ry + off, w: thick, h: cl });
      else out.push({ nivel: c.nivel, value: c.value, riesgos: c.riesgos, x: rx + off, y: ry, w: cl, h: thick });
      off += cl;
    }
    if (vertical) { rx += thick; rw -= thick; } else { ry += thick; rh -= thick; }
  }
  return out;
}

export default function MapaCalorRiesgos({ riesgos }: { riesgos: Riesgo[] }) {
  const [modo, setModo] = useState<Modo>("inherente");
  const [nivelSel, setNivelSel] = useState<NivelRiesgo | null>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(640);

  // Medir el ancho real del contenedor para dimensionar el treemap.
  useEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth || 640);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const soloRiesgos = useMemo(() => riesgos.filter((r) => r.categoria === "riesgo"), [riesgos]);

  const bloques = useMemo<Bloque[]>(() => {
    const m = new Map<NivelRiesgo, Riesgo[]>();
    for (const r of soloRiesgos) {
      const nv = nivelDe(r, modo);
      const arr = m.get(nv) ?? [];
      arr.push(r);
      m.set(nv, arr);
    }
    return ORDEN_NIVEL
      .filter((nv) => (m.get(nv)?.length ?? 0) > 0)
      .map((nv) => ({ nivel: nv, value: m.get(nv)!.length, riesgos: m.get(nv)! }));
  }, [soloRiesgos, modo]);

  const total = soloRiesgos.length;
  const ALTO = 380;
  const rects = useMemo(() => squarify(bloques, ancho, ALTO), [bloques, ancho]);

  const sinEvaluar = useMemo(
    () => (modo === "residual" ? soloRiesgos.filter((r) => r.gradoControl == null).length : 0),
    [soloRiesgos, modo],
  );

  const riesgosSel = nivelSel ? bloques.find((b) => b.nivel === nivelSel)?.riesgos ?? [] : [];

  return (
    <div>
      {/* Toggle inherente / residual */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
          {(["inherente", "residual"] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setModo(m); setNivelSel(null); }}
              className={
                "rounded-md px-3 py-1.5 font-medium transition-colors " +
                (modo === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")
              }
              aria-pressed={modo === m}
            >
              {m === "inherente" ? "Inherente" : "Residual"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          El tamaño de cada bloque es proporcional a la cantidad de riesgos.
        </p>
      </div>

      {modo === "residual" && sinEvaluar > 0 && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sinEvaluar} riesgo{sinEvaluar !== 1 ? "s" : ""} sin grado de control cargado: se clasifican por su nivel
          inherente hasta evaluarlos.
        </p>
      )}

      {/* Treemap */}
      <div ref={contRef} className="relative w-full rounded-lg" style={{ height: ALTO }}>
        {rects.map((r) => {
          const meta = NIVEL_META[r.nivel];
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
          const grande = r.w > 90 && r.h > 54;
          const sel = nivelSel === r.nivel;
          return (
            <button
              key={r.nivel}
              type="button"
              onClick={() => setNivelSel(sel ? null : r.nivel)}
              title={`${meta.label}: ${r.value} riesgos (${pct}%)`}
              className={"absolute overflow-hidden rounded-md text-left transition-all hover:brightness-95 " + (sel ? "ring-2 ring-foreground ring-offset-1" : "")}
              style={{
                left: r.x, top: r.y,
                width: Math.max(0, r.w - 3), height: Math.max(0, r.h - 3),
                backgroundColor: meta.fill, padding: grande ? "9px 11px" : "5px 7px",
              }}
            >
              <span className="block text-sm font-medium leading-tight" style={{ color: meta.texto }}>
                {meta.label}
              </span>
              {grande ? (
                <>
                  <span className="mt-0.5 block text-2xl font-semibold leading-none" style={{ color: meta.texto }}>{r.value}</span>
                  <span className="mt-1 block text-[11px]" style={{ color: meta.texto, opacity: 0.85 }}>{pct}% · tocá para ver</span>
                </>
              ) : (
                <span className="block text-sm leading-tight" style={{ color: meta.texto }}>{r.value}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda de niveles */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {ORDEN_NIVEL.map((nv) => (
          <span key={nv} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: NIVEL_META[nv].fill }} />
            {NIVEL_META[nv].label}
          </span>
        ))}
      </div>

      {/* Detalle del nivel seleccionado */}
      {nivelSel && riesgosSel.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-medium">
              {riesgosSel.length} riesgo{riesgosSel.length !== 1 ? "s" : ""} de nivel {NIVEL_META[nivelSel].label.toLowerCase()}
            </p>
            <button type="button" onClick={() => setNivelSel(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Cerrar
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {riesgosSel
              .slice()
              .sort((a, b) => b.probabilidad * b.impacto - a.probabilidad * a.impacto)
              .map((r) => {
                const inh = r.probabilidad * r.impacto;
                const res = residual(r.probabilidad, r.impacto, r.gradoControl as GradoControl).numerico;
                return (
                  <div key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0">
                    {r.categoria === "oportunidad"
                      ? <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      : <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground" title={r.codigo}>{r.codigo}</span>
                    <span className="flex-1 truncate" title={r.titulo}>{r.titulo}</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" title="Proceso">{r.procesoNombre}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{modo === "inherente" ? `inh ${inh}` : `res ${res}`}</span>
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

      <p className="mt-4 rounded-lg border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Cada bloque agrupa los riesgos de un nivel; su tamaño es proporcional a cuántos hay, para ver de un vistazo
        dónde se concentra el riesgo. Tocá un bloque para listar sus riesgos y editarlos. En modo residual, los
        riesgos se reclasifican según su grado de control (mismo cálculo que la vista por proceso).
      </p>
    </div>
  );
}
