"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen, AlertOctagon } from "lucide-react";
import type { NCOperativa } from "@/lib/api/ncReportes";

type Agrupacion = "proceso" | "gerencia" | "requisito" | "ninguno";

const ESTADO_META: Record<string, { label: string; bg: string; fg: string }> = {
  abierta: { label: "Abierta", bg: "#FCEBEB", fg: "#A32D2D" },
  en_analisis: { label: "En análisis", bg: "#FAEEDA", fg: "#854F0B" },
  en_tratamiento: { label: "En tratamiento", bg: "#E6F1FB", fg: "#185FA5" },
  cerrada: { label: "Cerrada", bg: "#E1F5EE", fg: "#0F6E56" },
  aceptado_riesgo: { label: "Riesgo aceptado", bg: "#F1EFE8", fg: "#5F5E5A" },
};
const SEV_META: Record<string, { label: string; bg: string; fg: string }> = {
  alta: { label: "Alta", bg: "#FCEBEB", fg: "#A32D2D" },
  media: { label: "Media", bg: "#FAEEDA", fg: "#854F0B" },
  baja: { label: "Baja", bg: "#F1EFE8", fg: "#5F5E5A" },
};

const SIN_GRUPO = "— Sin asignar —";

function claveGrupo(nc: NCOperativa, por: Agrupacion): string {
  if (por === "proceso") return nc.proceso ?? SIN_GRUPO;
  if (por === "gerencia") return nc.gerencia ?? SIN_GRUPO;
  if (por === "requisito") {
    if (!nc.requisitoClausula) return SIN_GRUPO;
    return `${nc.norma ?? "—"} · ${nc.requisitoClausula}${nc.requisitoTitulo ? ` ${nc.requisitoTitulo}` : ""}`;
  }
  return "Todas las no conformidades";
}

export function ReporteNCOperativo({ ncs }: { ncs: NCOperativa[] }) {
  const [agrupar, setAgrupar] = useState<Agrupacion>("proceso");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  const filtradas = useMemo(
    () => (filtroEstado ? ncs.filter((n) => n.estado === filtroEstado) : ncs),
    [ncs, filtroEstado],
  );

  const resumen = useMemo(() => {
    const total = filtradas.length;
    const cerradas = filtradas.filter((n) => n.estado === "cerrada").length;
    const vencidas = filtradas.filter((n) => n.vencida).length;
    const abiertas = total - cerradas;
    return { total, abiertas, vencidas, cerradas };
  }, [filtradas]);

  const grupos = useMemo(() => {
    const map = new Map<string, NCOperativa[]>();
    for (const nc of filtradas) {
      const k = claveGrupo(nc, agrupar);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(nc);
    }
    // ordenar: "sin asignar" al final, resto alfabético
    return [...map.entries()].sort(([a], [b]) => {
      if (a === SIN_GRUPO) return 1;
      if (b === SIN_GRUPO) return -1;
      return a.localeCompare(b, "es");
    });
  }, [filtradas, agrupar]);

  function toggle(k: string) {
    setColapsados((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  const botones: { v: Agrupacion; label: string }[] = [
    { v: "proceso", label: "Proceso" },
    { v: "gerencia", label: "Gerencia" },
    { v: "requisito", label: "Requisito" },
    { v: "ninguno", label: "Sin agrupar" },
  ];

  return (
    <div>
      {/* Controles */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Agrupar por:</span>
        {botones.map((b) => (
          <button
            key={b.v}
            onClick={() => setAgrupar(b.v)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              agrupar === b.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted/50"
            }`}
          >
            {b.label}
          </button>
        ))}
        <span className="flex-1" />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="en_analisis">En análisis</option>
          <option value="en_tratamiento">En tratamiento</option>
          <option value="cerrada">Cerrada</option>
          <option value="aceptado_riesgo">Riesgo aceptado</option>
        </select>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", valor: resumen.total, color: undefined },
          { label: "Abiertas", valor: resumen.abiertas, color: undefined },
          { label: "Vencidas", valor: resumen.vencidas, color: "#A32D2D" },
          { label: "Cerradas", valor: resumen.cerradas, color: undefined },
        ].map((c) => (
          <div key={c.label} className="rounded-md bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold" style={c.color ? { color: c.color } : undefined}>
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <AlertOctagon className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No hay no conformidades para este filtro</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(([grupo, items]) => {
            const colapsado = colapsados.has(grupo);
            return (
              <div key={grupo}>
                <button
                  onClick={() => toggle(grupo)}
                  className="mb-2 flex w-full items-center gap-2 border-b border-border pb-2 text-left"
                >
                  {colapsado ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="font-medium">{grupo}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </button>

                {!colapsado && (
                  <div className="space-y-1.5">
                    {items.map((nc) => {
                      const est = ESTADO_META[nc.estado] ?? ESTADO_META.abierta;
                      const sev = SEV_META[nc.severidad] ?? SEV_META.media;
                      return (
                        <Link
                          key={nc.id}
                          href={`/ncs/${nc.id}`}
                          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-shadow hover:shadow-sm"
                        >
                          <span className="font-mono text-xs text-muted-foreground">{nc.codigo}</span>
                          <span className="flex-1 truncate text-sm">
                            {nc.titulo}
                            {nc.requisitoClausula && agrupar !== "requisito" && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                <BookOpen className="inline h-3 w-3 align-[-1px]" />{" "}
                                {nc.norma} · {nc.requisitoClausula}
                                {nc.requisitoTitulo ? ` ${nc.requisitoTitulo}` : ""}
                              </span>
                            )}
                          </span>
                          {nc.vencida && (
                            <span
                              className="shrink-0 rounded-md px-2 py-0.5 text-[11px]"
                              style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
                            >
                              Vencida
                            </span>
                          )}
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 text-[11px]"
                            style={{ backgroundColor: sev.bg, color: sev.fg }}
                          >
                            {sev.label}
                          </span>
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 text-[11px]"
                            style={{ backgroundColor: est.bg, color: est.fg }}
                          >
                            {est.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {agrupar === "gerencia" && grupos.length === 1 && grupos[0][0] === SIN_GRUPO && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Las no conformidades todavía no tienen área/gerencia cargada, por eso aparecen todas sin asignar.
          En cuanto cargues el área de cada NC, este agrupamiento se completa solo.
        </p>
      )}
    </div>
  );
}
