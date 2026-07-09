"use client";

import { useMemo, useState } from "react";
import type {
  NodoFlujo, AristaFlujo, DataObject, PuestoRef, GapSubproceso, EstadoGap,
} from "@/lib/api/flujogramas-tipos";
import { agregarEstado } from "@/lib/api/flujogramas-tipos";

type Nivel = 0 | 1 | 2 | 3;
type Sel = { nivel: Nivel; procId: string | null; subId: string | null; pasoId: string | null };

const COLOR: Record<EstadoGap, string> = {
  rojo: "#dc2626", amarillo: "#d97706", verde: "#16a34a", sindatos: "#9ca3af",
};
const PUNTO: Record<EstadoGap, string> = { rojo: "🔴", amarillo: "🟡", verde: "🟢", sindatos: "⚪" };

export function FlujogramasVista({
  nodos, aristas, dataObjects, puestos, gaps,
}: {
  nodos: NodoFlujo[];
  aristas: AristaFlujo[];
  dataObjects: DataObject[];
  puestos: PuestoRef[];
  gaps: GapSubproceso[];
}) {
  const [sel, setSel] = useState<Sel>({ nivel: 0, procId: null, subId: null, pasoId: null });
  const [abierto, setAbierto] = useState<Record<string, boolean>>({});

  const porId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const procesos = useMemo(() => nodos.filter((n) => n.nivel === "proceso").sort((a, b) => a.orden - b.orden), [nodos]);
  const subsDe = useMemo(() => {
    const m = new Map<string, NodoFlujo[]>();
    nodos.filter((n) => n.nivel === "subproceso").forEach((s) => {
      if (!s.padreId) return;
      (m.get(s.padreId) ?? m.set(s.padreId, []).get(s.padreId)!).push(s);
    });
    return m;
  }, [nodos]);
  const pasosDe = useMemo(() => {
    const m = new Map<string, NodoFlujo[]>();
    nodos.filter((n) => n.nivel === "paso").forEach((p) => {
      if (!p.padreId) return;
      (m.get(p.padreId) ?? m.set(p.padreId, []).get(p.padreId)!).push(p);
    });
    for (const arr of m.values()) arr.sort((a, b) => a.orden - b.orden);
    return m;
  }, [nodos]);

  const gapDeSub = useMemo(() => new Map(gaps.map((g) => [g.subprocesoId, g])), [gaps]);
  const estadoDeProc = useMemo(() => {
    const m = new Map<string, EstadoGap>();
    for (const p of procesos) {
      const subs = subsDe.get(p.id) ?? [];
      m.set(p.id, agregarEstado(subs.map((s) => gapDeSub.get(s.id)?.estado ?? "sindatos")));
    }
    return m;
  }, [procesos, subsDe, gapDeSub]);

  const puestoNombre = useMemo(() => new Map(puestos.map((p) => [p.id, p.nombre])), [puestos]);

  const crumbs = useMemo(() => {
    const c: { label: string; go: Sel }[] = [{ label: "Procesos", go: { nivel: 0, procId: null, subId: null, pasoId: null } }];
    if (sel.procId) c.push({ label: porId.get(sel.procId)?.titulo ?? "", go: { nivel: 1, procId: sel.procId, subId: null, pasoId: null } });
    if (sel.subId) c.push({ label: porId.get(sel.subId)?.titulo ?? "", go: { nivel: 2, procId: sel.procId, subId: sel.subId, pasoId: null } });
    if (sel.pasoId) c.push({ label: porId.get(sel.pasoId)?.codigo ?? "paso", go: sel });
    return c;
  }, [sel, porId]);

  return (
    <div className="flex min-h-[70vh] gap-0 rounded-xl border border-border overflow-hidden bg-card">
      {/* Árbol lateral */}
      <aside className="w-64 shrink-0 border-r border-border bg-muted/30 p-3 overflow-auto max-h-[80vh]">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estructura</p>
        {procesos.map((p) => {
          const subs = subsDe.get(p.id) ?? [];
          const est = estadoDeProc.get(p.id) ?? "sindatos";
          const open = abierto[p.id];
          return (
            <div key={p.id}>
              <button
                onClick={() => { setAbierto((o) => ({ ...o, [p.id]: !o[p.id] })); setSel({ nivel: 1, procId: p.id, subId: null, pasoId: null }); }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-muted ${sel.procId === p.id && !sel.subId ? "bg-muted" : ""}`}
              >
                <span className="w-3 text-muted-foreground">{subs.length ? (open ? "▾" : "▸") : "·"}</span>
                <span className="text-[11px]">{PUNTO[est]}</span>
                <span className="flex-1 truncate">{p.titulo}</span>
              </button>
              {open && subs.map((s) => {
                const est2 = gapDeSub.get(s.id)?.estado ?? "sindatos";
                return (
                  <button
                    key={s.id}
                    onClick={() => setSel({ nivel: 2, procId: p.id, subId: s.id, pasoId: null })}
                    className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-left text-[13px] hover:bg-muted ${sel.subId === s.id ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="text-[10px]">{PUNTO[est2]}</span>
                    <span className="flex-1 truncate">{s.titulo}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </aside>

      {/* Lienzo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <button
                onClick={() => setSel(c.go)}
                className={`text-sm ${i === crumbs.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {sel.nivel === 0 && (
            <NivelProcesos
              procesos={procesos} subsDe={subsDe} gapDeSub={gapDeSub} estadoDeProc={estadoDeProc}
              onPick={(id) => setSel({ nivel: 1, procId: id, subId: null, pasoId: null })}
            />
          )}
          {sel.nivel === 1 && sel.procId && (
            <NivelSubprocesos
              proc={porId.get(sel.procId)!} subs={subsDe.get(sel.procId) ?? []} gapDeSub={gapDeSub}
              onPick={(id) => setSel({ nivel: 2, procId: sel.procId, subId: id, pasoId: null })}
            />
          )}
          {sel.nivel === 2 && sel.subId && (
            <NivelSwimlane
              sub={porId.get(sel.subId)!} pasos={pasosDe.get(sel.subId) ?? []} aristas={aristas}
              puestoNombre={puestoNombre}
              onPaso={(id) => setSel({ ...sel, nivel: 3, pasoId: id })}
            />
          )}
          {sel.nivel === 3 && sel.pasoId && (
            <FichaPaso
              paso={porId.get(sel.pasoId)!} dataObjects={dataObjects.filter((d) => d.nodoId === sel.pasoId)}
              puestoNombre={puestoNombre}
              onClose={() => setSel({ ...sel, nivel: 2, pasoId: null })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Nivel 0 ──
function NivelProcesos({ procesos, subsDe, gapDeSub, estadoDeProc, onPick }: {
  procesos: NodoFlujo[];
  subsDe: Map<string, NodoFlujo[]>;
  gapDeSub: Map<string, GapSubproceso>;
  estadoDeProc: Map<string, EstadoGap>;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">Mapa de procesos</h2>
      <p className="mb-5 text-sm text-muted-foreground">El color agrega el estado de cumplimiento de los subprocesos. Clic para entrar.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
        {procesos.map((p) => {
          const subs = subsDe.get(p.id) ?? [];
          const est = estadoDeProc.get(p.id) ?? "sindatos";
          const nRojo = subs.filter((s) => gapDeSub.get(s.id)?.estado === "rojo").length;
          return (
            <button
              key={p.id} onClick={() => onPick(p.id)}
              className="rounded-xl border border-border bg-background p-4 text-left transition hover:shadow-md"
              style={{ borderLeftWidth: 4, borderLeftColor: COLOR[est] }}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium">{p.titulo}</span>
                <span>{PUNTO[est]}</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {subs.length} subproceso{subs.length !== 1 ? "s" : ""}
                {nRojo > 0 && <span className="font-semibold text-red-600"> · {nRojo} con riesgo sin control</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Nivel 1 ──
function NivelSubprocesos({ proc, subs, gapDeSub, onPick }: {
  proc: NodoFlujo; subs: NodoFlujo[]; gapDeSub: Map<string, GapSubproceso>; onPick: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">{proc.titulo}</h2>
      <p className="mb-5 text-sm text-muted-foreground">Subprocesos (etapas). Clic para ver el flujograma detallado.</p>
      <div className="flex flex-wrap items-stretch gap-3">
        {subs.map((s) => {
          const g = gapDeSub.get(s.id);
          const est = g?.estado ?? "sindatos";
          return (
            <button
              key={s.id} onClick={() => onPick(s.id)}
              className="min-w-[200px] max-w-[240px] rounded-xl border border-border bg-background p-4 text-left transition hover:shadow-md"
              style={{ borderTopWidth: 4, borderTopColor: COLOR[est] }}
            >
              <div className="mb-3 font-medium">{s.titulo}</div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>⚠ {g?.riesgos ?? 0} riesgos</span>
                <span>✓ {g?.controles ?? 0} ctrl</span>
              </div>
              <div className="mt-2 text-[11px] font-semibold" style={{ color: COLOR[est] }}>
                {PUNTO[est]} {g?.etiqueta ?? "Sin datos"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Nivel 2: swimlane BPMN ──
function NivelSwimlane({ sub, pasos, aristas, puestoNombre, onPaso }: {
  sub: NodoFlujo; pasos: NodoFlujo[]; aristas: AristaFlujo[];
  puestoNombre: Map<string, string>; onPaso: (id: string) => void;
}) {
  if (pasos.length === 0) {
    return (
      <div>
        <h2 className="mb-1 font-serif text-2xl font-semibold">{sub.titulo}</h2>
        <p className="text-sm text-muted-foreground">Este subproceso no tiene pasos cargados.</p>
      </div>
    );
  }
  const idx = new Map(pasos.map((p, i) => [p.id, i]));
  const lanes = Array.from(new Set(pasos.map((p) => p.puestoId ?? "—")));
  const LANE_H = 116, COL_W = 210, NODE_W = 150, NODE_H = 58, HEAD = 160, TOP = 20;
  const posX = (i: number) => HEAD + i * COL_W + (COL_W - NODE_W) / 2;
  const laneY = (lane: string) => TOP + lanes.indexOf(lane) * LANE_H + (LANE_H - NODE_H) / 2;
  const W = HEAD + pasos.length * COL_W + 20;
  const H = lanes.length * LANE_H + TOP + 12;
  const salidas = (id: string) => aristas.filter((a) => a.origenId === id);

  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">{sub.titulo}</h2>
      <p className="mb-3 text-sm text-muted-foreground">Swimlane BPMN · carril = puesto responsable. Clic en un paso para su ficha.</p>
      <div className="overflow-auto rounded-lg border border-border">
        <svg width={W} height={H} className="block">
          <defs>
            <marker id="fl-ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
            </marker>
          </defs>
          {lanes.map((ln, i) => (
            <g key={ln}>
              <rect x={0} y={TOP + i * LANE_H} width={W} height={LANE_H} fill={i % 2 ? "#f8fafc" : "#f1f5f9"} />
              <rect x={0} y={TOP + i * LANE_H} width={HEAD} height={LANE_H} fill="#e2e8f0" />
              <text x={12} y={TOP + i * LANE_H + LANE_H / 2} fontSize={12} fontWeight={600} fill="#334155" dominantBaseline="middle">
                {(puestoNombre.get(ln) ?? "Sin asignar").slice(0, 22)}
              </text>
            </g>
          ))}
          {pasos.map((p) => salidas(p.id).map((a) => {
            const j = idx.get(a.destinoId);
            if (j === undefined) return null;
            const b = pasos[j];
            const back = (idx.get(b.id) ?? 0) <= (idx.get(p.id) ?? 0);
            const x1 = posX(idx.get(p.id)!) + NODE_W, y1 = laneY(p.puestoId ?? "—") + NODE_H / 2;
            const x2 = posX(j), y2 = laneY(b.puestoId ?? "—") + NODE_H / 2;
            const col = a.etiqueta === "Rechazado" || a.etiqueta === "No" || a.etiqueta === "Difiere" ? "#dc2626"
              : a.tipo === "rama" ? "#16a34a" : "#94a3b8";
            const d = back
              ? `M ${posX(idx.get(p.id)!) + NODE_W / 2} ${laneY(p.puestoId ?? "—")} C ${x1} ${TOP - 6}, ${x2} ${TOP - 6}, ${posX(j) + NODE_W / 2} ${laneY(b.puestoId ?? "—")}`
              : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
            const mx = (x1 + x2) / 2, my = back ? TOP - 6 : (y1 + y2) / 2 - 6;
            return (
              <g key={a.id}>
                <path d={d} fill="none" stroke={col} strokeWidth={1.8} markerEnd="url(#fl-ar)" strokeDasharray={back ? "4 3" : "0"} />
                {a.etiqueta && (
                  <text x={mx} y={my} fontSize={10} fontWeight={700} fill={col} textAnchor="middle">{a.etiqueta}</text>
                )}
              </g>
            );
          }))}
          {pasos.map((p) => {
            const x = posX(idx.get(p.id)!), y = laneY(p.puestoId ?? "—");
            const dec = p.tipoBpmn === "decision";
            const ev = p.tipoBpmn === "inicio" || p.tipoBpmn === "fin";
            const fill = dec ? "#fef3c7" : ev ? "#dbeafe" : "#dcfce7";
            const stroke = dec ? "#d97706" : ev ? "#2563eb" : "#16a34a";
            const gapMark = p.codRiesgo && p.tipoBpmn !== "decision";
            return (
              <g key={p.id} className="cursor-pointer" onClick={() => onPaso(p.id)}>
                {dec ? (
                  <polygon points={`${x + NODE_W / 2},${y} ${x + NODE_W},${y + NODE_H / 2} ${x + NODE_W / 2},${y + NODE_H} ${x},${y + NODE_H / 2}`} fill={fill} stroke={stroke} strokeWidth={1.6} />
                ) : (
                  <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={ev ? 26 : 9} fill={fill} stroke={stroke} strokeWidth={1.6} />
                )}
                <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 4} fontSize={11} fontWeight={600} fill="#1e293b" textAnchor="middle">
                  {(p.titulo ?? "").length > 18 ? p.titulo.slice(0, 17) + "…" : p.titulo}
                </text>
                {gapMark && <text x={x + NODE_W - 12} y={y + 14} fontSize={13}>⚠</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ⚠ marca pasos que declaran riesgo sin ser control. La secuencia proviene del orden del relevamiento; corregila donde no refleje el flujo real.
      </p>
    </div>
  );
}

// ── Nivel 3: ficha ──
function FichaPaso({ paso, dataObjects, puestoNombre, onClose }: {
  paso: NodoFlujo; dataObjects: DataObject[]; puestoNombre: Map<string, string>; onClose: () => void;
}) {
  const entradas = dataObjects.filter((d) => d.direccion === "entrada");
  const salidas = dataObjects.filter((d) => d.direccion === "salida");
  const gap = paso.codRiesgo && paso.tipoBpmn !== "decision";
  const Row = ({ k, v, danger }: { k: string; v: string; danger?: boolean }) => (
    <div className="flex border-b border-border py-2.5">
      <span className="w-40 text-sm text-muted-foreground">{k}</span>
      <span className={`flex-1 text-sm ${danger ? "font-medium text-red-600" : ""}`}>{v}</span>
    </div>
  );
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold">{paso.titulo}</h2>
        <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">← volver al flujo</button>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <Row k="Código" v={paso.codigo ?? "—"} />
        <Row k="Responsable (carril)" v={paso.puestoId ? (puestoNombre.get(paso.puestoId) ?? "—") : "—"} />
        <Row k="Tipo BPMN" v={paso.tipoBpmn ?? "—"} />
        <Row k="Documentos entrada" v={entradas.length ? entradas.map((d) => d.etiqueta).join(" · ") : "—"} />
        <Row k="Documentos salida" v={salidas.length ? salidas.map((d) => d.etiqueta).join(" · ") : "—"} />
        <Row k="Riesgo declarado" v={paso.codRiesgo ?? "— ninguno —"} />
        <Row k="Normativa" v={paso.normativa ?? "—"} />
        {gap && <Row k="⚠ Gap detectado" v="Declara riesgo pero no es un control. Candidato a NC (2ª etapa)." danger />}
      </div>
    </div>
  );
}
