"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formaDeNodo, puntoEnLado, pathOrtogonal, claseRama, asignarCanales, asignarLados,
} from "@/lib/api/flujogramas-tipos";

type Nodo = {
  id: string;
  nivel: "proceso" | "subproceso" | "paso";
  padre_id: string | null;
  codigo: string | null;
  titulo: string;
  tipo_bpmn: "inicio" | "tarea" | "decision" | "fin" | null;
  puesto_id: string | null;
  orden: number;
};
type Arista = { id: string; origen_id: string; destino_id: string; tipo: string; etiqueta: string | null };

function envolver(texto: string, maxChars: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const w of palabras) {
    if ((actual + " " + w).trim().length <= maxChars) actual = (actual + " " + w).trim();
    else {
      if (actual) lineas.push(actual);
      actual = w;
      if (lineas.length === maxLineas - 1) break;
    }
  }
  if (actual && lineas.length < maxLineas) lineas.push(actual);
  const usadas = lineas.join(" ").split(/\s+/).length;
  if (usadas < palabras.length && lineas.length > 0) lineas[lineas.length - 1] += "…";
  return lineas;
}

// Dibuja un subproceso como swimlane (mismo criterio que el módulo Flujogramas)
function Swimlane({
  pasos, aristas, puestoNombre,
}: {
  pasos: Nodo[];
  aristas: Arista[];
  puestoNombre: Map<string, string>;
}) {
  if (pasos.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Este subproceso no tiene pasos.</p>;
  }
  const idx = new Map(pasos.map((p, i) => [p.id, i]));
  const lanes = Array.from(new Set(pasos.map((p) => p.puesto_id ?? "—")));
  const LANE_H = 116, COL_W = 210, NODE_W = 150, NODE_H = 58, HEAD = 160, TOP = 20;
  const posX = (i: number) => HEAD + i * COL_W + (COL_W - NODE_W) / 2;
  const laneY = (lane: string) => TOP + lanes.indexOf(lane) * LANE_H + (LANE_H - NODE_H) / 2;
  const W = HEAD + pasos.length * COL_W + 20;
  const H = lanes.length * LANE_H + TOP + 24;

  const aristasInternas = aristas.filter((a) => idx.has(a.origen_id) && idx.has(a.destino_id));
  const canales = asignarCanales(
    aristasInternas.map((a) => ({ id: a.id, origenId: a.origen_id, destinoId: a.destino_id }))
  );
  const posNodo = (id: string) => {
    const n = pasos.find((p) => p.id === id);
    const i = idx.get(id);
    if (!n || i === undefined) return null;
    return { cx: posX(i) + NODE_W / 2, cy: laneY(n.puesto_id ?? "—") + NODE_H / 2 };
  };
  const lados = asignarLados(
    pasos.map((p) => ({ id: p.id })),
    aristasInternas.map((a) => ({ id: a.id, origenId: a.origen_id, destinoId: a.destino_id })),
    posNodo
  );

  return (
    <div className="overflow-auto rounded-lg border border-border bg-white">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full">
        <defs>
          <marker id="fd-ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
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
        {aristasInternas.map((a) => {
          const i = idx.get(a.origen_id)!, j = idx.get(a.destino_id)!;
          const o = pasos[i], b = pasos[j];
          const ox = posX(i), oy = laneY(o.puesto_id ?? "—");
          const bx = posX(j), by = laneY(b.puesto_id ?? "—");
          const lad = lados.get(a.id) ?? { ladoSal: "der" as const, ladoEnt: "izq" as const };
          const s = puntoEnLado(formaDeNodo(o.tipo_bpmn), ox, oy, NODE_W, NODE_H, lad.ladoSal);
          const e = puntoEnLado(formaDeNodo(b.tipo_bpmn), bx, by, NODE_W, NODE_H, lad.ladoEnt);
          const clase = claseRama(a.etiqueta);
          const col = clase === "desvio" ? "#dc2626" : clase === "feliz" ? "#16a34a" : a.tipo === "rama" ? "#64748b" : "#94a3b8";
          const d = pathOrtogonal(s.px, s.py, lad.ladoSal, e.px, e.py, lad.ladoEnt, 22, canales.get(a.id) ?? 0);
          const mx = (s.px + e.px) / 2, my = (s.py + e.py) / 2 - 6;
          return (
            <g key={a.id}>
              <path d={d} fill="none" stroke={col} strokeWidth={1.8} markerEnd="url(#fd-ar)" strokeDasharray={j <= i ? "4 3" : "0"} />
              {a.etiqueta && (
                <g>
                  <rect x={mx - a.etiqueta.length * 3.2 - 4} y={my - 10} width={a.etiqueta.length * 6.4 + 8} height={15} rx={3} fill="#fff" stroke={col} strokeWidth={0.8} />
                  <text x={mx} y={my} fontSize={10} fontWeight={700} fill={col} textAnchor="middle">{a.etiqueta}</text>
                </g>
              )}
            </g>
          );
        })}
        {pasos.map((p) => {
          const i = idx.get(p.id)!;
          const x = posX(i), y = laneY(p.puesto_id ?? "—");
          const dec = p.tipo_bpmn === "decision";
          const esInicio = p.tipo_bpmn === "inicio";
          const esFin = p.tipo_bpmn === "fin";
          const ev = esInicio || esFin;
          const fill = dec ? "#fef3c7" : esFin ? "#fee2e2" : "#dcfce7";
          const stroke = dec ? "#d97706" : esFin ? "#dc2626" : "#16a34a";
          const t = p.titulo ?? "";
          const entra = !ev && t.length <= 18;
          return (
            <g key={p.id}>
              {dec ? (
                <polygon points={`${x + NODE_W / 2},${y} ${x + NODE_W},${y + NODE_H / 2} ${x + NODE_W / 2},${y + NODE_H} ${x},${y + NODE_H / 2}`} fill={fill} stroke={stroke} strokeWidth={1.6} />
              ) : ev ? (
                <circle cx={x + NODE_W / 2} cy={y + NODE_H / 2} r={NODE_H / 2 - 2} fill={fill} stroke={stroke} strokeWidth={esFin ? 3 : 1.6} />
              ) : (
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={9} fill={fill} stroke={stroke} strokeWidth={1.6} />
              )}
              {entra ? (
                <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 4} fontSize={11} fontWeight={600} fill="#1e293b" textAnchor="middle">{t}</text>
              ) : (
                <text x={x + NODE_W / 2} y={y + NODE_H + 12} fontSize={10} fontWeight={600} fill="#475569" textAnchor="middle">
                  {envolver(t, 26, 2).map((ln, k) => (
                    <tspan key={k} x={x + NODE_W / 2} dy={k === 0 ? 0 : 11}>{ln}</tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FlujogramaDelDocumento({
  numeroVersion, flujoNodoId, nodos, aristas, puestos, congeladoEn,
}: {
  numeroVersion: string;
  flujoNodoId: string;
  nodos: Nodo[];
  aristas: Arista[];
  puestos: { id: string; nombre: string }[];
  congeladoEn: string | null;
}) {
  const subprocesos = nodos.filter((n) => n.nivel === "subproceso").sort((a, b) => a.orden - b.orden);
  const pasosDe = (subId: string) =>
    nodos.filter((n) => n.nivel === "paso" && n.padre_id === subId).sort((a, b) => a.orden - b.orden);
  const puestoNombre = new Map(puestos.map((p) => [p.id, p.nombre]));
  const [subSel, setSubSel] = useState(subprocesos[0]?.id ?? "");

  if (subprocesos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Este flujograma no tiene subprocesos cargados.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Flujograma congelado en la versión <span className="font-medium text-foreground">{numeroVersion}</span>
          {congeladoEn && <> · {new Date(congeladoEn).toLocaleDateString("es-AR")}</>}
        </p>
        <Link
          href={`/flujogramas?proceso_flujo=${flujoNodoId}`}
          className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
        >
          Ver flujograma actual →
        </Link>
      </div>

      {subprocesos.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {subprocesos.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubSel(s.id)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                subSel === s.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"
              }`}
            >
              {s.titulo}
            </button>
          ))}
        </div>
      )}

      {subSel && (
        <Swimlane
          pasos={pasosDe(subSel)}
          aristas={aristas}
          puestoNombre={puestoNombre}
        />
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Esta es la versión aprobada del flujo. Si el flujograma se modificó después, los cambios se verán al
        publicar una nueva versión.
      </p>
    </div>
  );
}
