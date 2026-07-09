"use client";

import { useState, useRef, useEffect } from "react";
import type { NodoFlujo, AristaFlujo, SubtipoEvento } from "@/lib/api/flujogramas-tipos";
import { formaDeNodo, puntoContacto } from "@/lib/api/flujogramas-tipos";

// Símbolo BPMN dentro del círculo de evento según subtipo
function IconoEvento({ subtipo, cx, cy }: { subtipo: SubtipoEvento; cx: number; cy: number }) {
  const s = "#1e293b";
  switch (subtipo) {
    case "mensaje":
      return <rect x={cx - 7} y={cy - 5} width={14} height={10} fill="none" stroke={s} strokeWidth={1.3} />;
    case "temporizador":
      return (
        <g stroke={s} strokeWidth={1.3} fill="none">
          <circle cx={cx} cy={cy} r={7} />
          <line x1={cx} y1={cy} x2={cx} y2={cy - 4} />
          <line x1={cx} y1={cy} x2={cx + 3} y2={cy + 2} />
        </g>
      );
    case "senial":
      return <polygon points={`${cx},${cy - 7} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`} fill="none" stroke={s} strokeWidth={1.3} />;
    case "condicional":
      return (
        <g stroke={s} strokeWidth={1.2} fill="none">
          <rect x={cx - 6} y={cy - 6} width={12} height={12} />
          <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy - 3} />
          <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
          <line x1={cx - 3} y1={cy + 3} x2={cx + 3} y2={cy + 3} />
        </g>
      );
    case "error":
      return <polyline points={`${cx - 5},${cy + 5} ${cx - 1},${cy - 3} ${cx + 1},${cy + 2} ${cx + 5},${cy - 5}`} fill="none" stroke={s} strokeWidth={1.5} />;
    case "terminacion":
      return <circle cx={cx} cy={cy} r={5} fill={s} />;
    default:
      return null;
  }
}

type Props = {
  titulo: string;
  pasos: NodoFlujo[];
  aristas: AristaFlujo[];
  puestoNombre: Map<string, string>;
  onPaso: (id: string) => void;
  onClose: () => void;
};

export function ModalFlujograma({ titulo, pasos, aristas, puestoNombre, onPaso, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const contRef = useRef<HTMLDivElement>(null);

  const idx = new Map(pasos.map((p, i) => [p.id, i]));
  const lanes = Array.from(new Set(pasos.map((p) => p.puestoId ?? "—")));
  const LANE_H = 120, COL_W = 210, NODE_W = 150, NODE_H = 58, HEAD = 160, TOP = 20;
  const posX = (i: number) => HEAD + i * COL_W + (COL_W - NODE_W) / 2;
  const laneY = (lane: string) => TOP + lanes.indexOf(lane) * LANE_H + (LANE_H - NODE_H) / 2;
  const W = HEAD + pasos.length * COL_W + 20;
  const H = lanes.length * LANE_H + TOP + 12;
  const salidas = (id: string) => aristas.filter((a) => a.origenId === id);

  // fit-to-width al abrir
  useEffect(() => {
    if (contRef.current && W > 0) {
      const avail = contRef.current.clientWidth - 32;
      setZoom(Math.min(1, avail / W));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W]);

  // cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="m-2 flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card sm:m-4" onClick={(e) => e.stopPropagation()}>
        {/* barra */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold truncate">{titulo}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" aria-label="Alejar">−</button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" aria-label="Acercar">+</button>
            <button onClick={() => { if (contRef.current) setZoom(Math.min(1, (contRef.current.clientWidth - 32) / W)); }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">Ajustar</button>
            <button onClick={onClose} className="ml-2 rounded-md border border-border px-3 py-1 text-sm hover:bg-muted">Cerrar ✕</button>
          </div>
        </div>
        {/* lienzo con scroll */}
        <div ref={contRef} className="flex-1 overflow-auto p-4">
          <svg width={W * zoom} height={H * zoom} viewBox={`0 0 ${W} ${H}`} className="block">
            <defs>
              <marker id="fm-ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 z" fill="#64748b" />
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
              const iP = idx.get(p.id)!;
              const back = j <= iP;
              // bounding boxes
              const ox = posX(iP), oy = laneY(p.puestoId ?? "—");
              const bx = posX(j), by = laneY(b.puestoId ?? "—");
              const oCx = ox + NODE_W / 2, oCy = oy + NODE_H / 2;
              const bCx = bx + NODE_W / 2, bCy = by + NODE_H / 2;
              // punto de contacto en el borde real de cada figura
              const start = puntoContacto(formaDeNodo(p.tipoBpmn), ox, oy, NODE_W, NODE_H, bCx, bCy);
              const end = puntoContacto(formaDeNodo(b.tipoBpmn), bx, by, NODE_W, NODE_H, oCx, oCy);
              const GAP = 4;
              // separar la punta un poco del borde (en dirección al centro del destino)
              const evx = bCx - end.px, evy = bCy - end.py;
              const evl = Math.hypot(evx, evy) || 1;
              const ex = end.px - (evx / evl) * GAP, ey = end.py - (evy / evl) * GAP;
              const sx = start.px, sy = start.py;
              const col = a.etiqueta === "Rechazado" || a.etiqueta === "No" || a.etiqueta === "Difiere" ? "#dc2626"
                : a.tipo === "rama" ? "#16a34a" : "#94a3b8";
              // curva: control points según separación vertical
              const distintoCarril = Math.abs(bCy - oCy) > NODE_H;
              const midX = (sx + ex) / 2;
              const d = distintoCarril
                ? `M ${sx} ${sy} C ${sx + (back ? -50 : 50)} ${sy}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}`
                : `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ey}, ${ex} ${ey}`;
              const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 6;
              return (
                <g key={a.id}>
                  <path d={d} fill="none" stroke={col} strokeWidth={1.8} markerEnd="url(#fm-ar)" strokeDasharray={back ? "4 3" : "0"} />
                  {a.etiqueta && <text x={mx} y={my} fontSize={10} fontWeight={700} fill={col} textAnchor="middle" style={{ paintOrder: "stroke" }} stroke="#ffffff" strokeWidth={3}>{a.etiqueta}</text>}
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
                  ) : ev ? (
                    <>
                      <circle cx={x + NODE_W / 2} cy={y + NODE_H / 2} r={NODE_H / 2 - 2} fill={fill} stroke={stroke} strokeWidth={p.tipoBpmn === "fin" ? 3 : 1.6} />
                      <IconoEvento subtipo={p.subtipoEvento} cx={x + NODE_W / 2} cy={y + NODE_H / 2} />
                    </>
                  ) : (
                    <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={9} fill={fill} stroke={stroke} strokeWidth={1.6} />
                  )}
                  {!ev && (
                    <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 4} fontSize={11} fontWeight={600} fill="#1e293b" textAnchor="middle">
                      {(p.titulo ?? "").length > 18 ? p.titulo.slice(0, 17) + "…" : p.titulo}
                    </text>
                  )}
                  {ev && (
                    <text x={x + NODE_W / 2} y={y + NODE_H + 12} fontSize={10} fontWeight={600} fill="#475569" textAnchor="middle">
                      {(p.titulo ?? "").length > 20 ? p.titulo.slice(0, 19) + "…" : p.titulo}
                    </text>
                  )}
                  {gapMark && <text x={x + NODE_W - 12} y={y + 14} fontSize={13}>⚠</text>}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
