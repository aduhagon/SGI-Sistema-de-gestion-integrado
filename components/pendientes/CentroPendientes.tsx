"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrupoPendientes, NivelPendiente, Pendiente } from "@/lib/api/pendientes";

const NIVEL: Record<NivelPendiente, { orden: number; label: string; card: string; dot: string }> = {
  vencido: { orden: 0, label: "Vencido", card: "border-red-200 bg-red-50/60", dot: "bg-red-600" },
  vencido_hoy: { orden: 1, label: "Vence hoy", card: "border-red-200 bg-red-50/40", dot: "bg-red-500" },
  advertencia: { orden: 2, label: "Próximo", card: "border-amber-200 bg-amber-50/40", dot: "bg-amber-500" },
  recordatorio: { orden: 3, label: "Planificado", card: "border-border bg-card", dot: "bg-sky-500" },
};

type ItemConGrupo = Pendiente & { grupo: string };

export function CentroPendientes({ grupos }: { grupos: GrupoPendientes[] }) {
  const [filtro, setFiltro] = useState<"todos" | "urgentes" | "proximos">("todos");
  const [modulo, setModulo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const items = useMemo(() => grupos.flatMap((grupo) => grupo.items.map((item): ItemConGrupo => ({ ...item, grupo: grupo.label }))), [grupos]);
  const visibles = useMemo(() => items
    .filter((item) => modulo === "todos" || item.modulo === modulo)
    .filter((item) => filtro === "todos" || (filtro === "urgentes" && ["vencido", "vencido_hoy"].includes(item.nivel)) || (filtro === "proximos" && ["advertencia", "recordatorio"].includes(item.nivel)))
    .filter((item) => `${item.codigo} ${item.titulo} ${item.grupo}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")))
    .sort((a, b) => NIVEL[a.nivel].orden - NIVEL[b.nivel].orden || (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999)), [items, modulo, filtro, busqueda]);

  return <section aria-label="Listado de pendientes">
    <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Buscar pendientes</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, tarea o módulo" className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm" /></label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" aria-label="Filtrar por urgencia">
          {([['todos', 'Todos'], ['urgentes', 'Urgentes'], ['proximos', 'Próximos']] as const).map(([valor, label]) => <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor} className={cn("min-h-9 rounded-md px-3 text-xs font-medium", filtro === valor ? "bg-background shadow-sm" : "text-muted-foreground")}>{label}</button>)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1"><Filter className="h-4 w-4 shrink-0 text-muted-foreground" /><button type="button" onClick={() => setModulo("todos")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", modulo === "todos" ? "border-primary bg-primary text-primary-foreground" : "border-border")}>Todos los módulos</button>{grupos.map((grupo) => <button key={grupo.modulo} type="button" onClick={() => setModulo(grupo.modulo)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", modulo === grupo.modulo ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{grupo.label} · {grupo.items.length}</button>)}</div>
    </div>
    <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{visibles.length}</strong> tareas visibles</p>{(filtro !== "todos" || modulo !== "todos" || busqueda) && <button type="button" onClick={() => { setFiltro("todos"); setModulo("todos"); setBusqueda(""); }} className="text-xs text-primary hover:underline">Limpiar filtros</button>}</div>
    {visibles.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No hay tareas que coincidan con los filtros.</div> : <div className="space-y-2">{visibles.map((item) => {
      const meta = NIVEL[item.nivel];
      const plazo = item.diasRestantes == null ? meta.label : item.diasRestantes < 0 ? `Vencido hace ${Math.abs(item.diasRestantes)} día${Math.abs(item.diasRestantes) === 1 ? "" : "s"}` : item.diasRestantes === 0 ? "Vence hoy" : `En ${item.diasRestantes} día${item.diasRestantes === 1 ? "" : "s"}`;
      return <Link key={`${item.modulo}-${item.entidadId}`} href={item.urlDestino} className={cn("group grid min-w-0 gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center", meta.card)}><span className={cn("mt-1 h-2.5 w-2.5 rounded-full sm:mt-0", meta.dot)} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{item.codigo}</span><span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">{item.grupo}</span></span><span className="mt-1 block break-words text-sm font-medium">{item.titulo}</span></span><span className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-semibold text-muted-foreground">{plazo}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></span></Link>;
    })}</div>}
  </section>;
}
