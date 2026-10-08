"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrupoPendientes, NivelPendiente, Pendiente } from "@/lib/api/pendientes";

const NIVEL: Record<NivelPendiente, { orden: number; label: string; card: string; dot: string }> = {
  vencido: { orden: 0, label: "Vencido", card: "border-red-200 bg-red-50/60", dot: "bg-red-600" },
  vencido_hoy: { orden: 1, label: "Vence hoy", card: "border-red-200 bg-red-50/40", dot: "bg-red-500" },
  advertencia: { orden: 2, label: "Próximo", card: "border-amber-200 bg-amber-50/40", dot: "bg-amber-500" },
  recordatorio: { orden: 3, label: "Planificado", card: "border-border bg-card", dot: "bg-sky-500" },
};

type ItemConGrupo = Pendiente & { grupo: string; responsableOperativo: string };

type ResponsablePendientes = {
  nombre: string;
  total: number;
  vencidos: number;
  hoy: number;
  proximos: number;
  modulos: string[];
};

const ACCION: Record<string, string> = {
  aprobaciones: "Revisar aprobación",
  acuses: "Leer y firmar lectura",
  no_conformidades: "Revisar no conformidad",
  acciones: "Completar acción",
  hallazgos: "Tratar hallazgo",
  auditorias: "Preparar auditoría",
  riesgos: "Revisar riesgo",
  indicadores: "Registrar medición",
  documentos: "Revisar documento",
  controles: "Ejecutar control",
  controles_observados: "Tratar resultado del control",
  requisitos_legales: "Evaluar requisito legal",
  asignaciones_legales: "Gestionar responsables legales",
  documentacion: "Revisar cambio documental y lecturas",
  tratamiento: "Planificar tratamiento",
  verificaciones: "Verificar eficacia",
  cierres: "Revisar cierre de la no conformidad",
};

const MOTIVO: Record<string, string> = {
  aprobaciones: "Asignado por flujo de aprobación pendiente.",
  acuses: "Asignado por lectura pendiente del documento.",
  no_conformidades: "Asignado por acceso a la no conformidad.",
  acciones: "Asignado por responsabilidad o participación en la acción.",
  hallazgos: "Asignado por tratamiento de hallazgo.",
  auditorias: "Asignado por rol o participación en auditoría.",
  riesgos: "Asignado por responsabilidad del riesgo.",
  indicadores: "Asignado por medición pendiente del indicador.",
  documentos: "Asignado por revisión documental pendiente.",
  controles: "Asignado por puesto responsable vigente.",
  controles_observados: "Asignado por responsabilidad sobre el control observado.",
  requisitos_legales: "Asignado por tu puesto vigente.",
  asignaciones_legales: "Asignado por rol de gestión SGI/legal.",
  documentacion: "Asignado por cambio documental vinculado a la NC.",
  tratamiento: "Asignado por responsabilidad de tratamiento.",
  verificaciones: "Asignado por verificador de eficacia asignado.",
  cierres: "Asignado por responsable de tratamiento con eficacia verificada.",
};

const PATRONES_RESPONSABLES: Array<{ regex: RegExp; prefijo?: string }> = [
  { regex: /Asignado como responsable de tratamiento:\s*([^.;]+)/i },
  { regex: /Asignado como verificador independiente:\s*([^.;]+)/i },
  { regex: /responsable:\s*([^.;]+)/i },
  { regex: /Asignado por tu puesto vigente:\s*([^.;]+)/i, prefijo: "Puesto: " },
  { regex: /Asignado por puesto responsable vigente:\s*([^.;]+)/i, prefijo: "Puesto: " },
];

export function accionPendiente(modulo: string): string {
  return ACCION[modulo] ?? "Revisar tarea";
}

export function motivoPendiente(modulo: string, motivo?: string | null): string {
  const especifico = motivo?.trim();
  return especifico || MOTIVO[modulo] || "Asignado por una regla operativa del sistema.";
}

function normalizarResponsable(valor: string): string {
  return valor.replace(/\s+/g, " ").trim();
}

function responsableOperativoPendiente(modulo: string, motivo?: string | null): string {
  const texto = motivoPendiente(modulo, motivo);

  for (const patron of PATRONES_RESPONSABLES) {
    const match = texto.match(patron.regex);
    const valor = match?.[1] ? normalizarResponsable(match[1]) : "";
    if (valor) return `${patron.prefijo ?? ""}${valor}`;
  }

  if (/gesti[oó]n SGI\/legal/i.test(texto)) return "Gestión SGI/legal";
  if (/aprobaci[oó]n documental/i.test(texto)) return "Aprobación documental";
  if (/lectura pendiente|destinatario de lectura/i.test(texto)) return "Lectura documental";
  return "Mi bandeja";
}

export function fechaLimitePendiente(valor: string | null): string {
  if (!valor) return "Sin fecha límite definida";
  // Una fecha de calendario no debe desplazarse por la zona del navegador.
  const calendario = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const fecha = new Date(calendario ? `${valor}T12:00:00Z` : valor);
  if (Number.isNaN(fecha.getTime())) return "Fecha límite no disponible";
  return `Fecha límite: ${new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: calendario ? "UTC" : "America/Argentina/Buenos_Aires" }).format(fecha)}`;
}

export function CentroPendientes({ grupos }: { grupos: GrupoPendientes[] }) {
  const [filtro, setFiltro] = useState<"todos" | "urgentes" | "proximos">("todos");
  const [modulo, setModulo] = useState("todos");
  const [responsable, setResponsable] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const items = useMemo(() => grupos.flatMap((grupo) => grupo.items.map((item): ItemConGrupo => ({ ...item, grupo: grupo.label, responsableOperativo: responsableOperativoPendiente(item.modulo, item.motivo) }))), [grupos]);
  const moduloActivo = useMemo(() => {
    if (modulo === "todos") return { label: "Todos los módulos", cantidad: items.length };
    const grupo = grupos.find((actual) => actual.modulo === modulo);
    return { label: grupo?.label ?? "Módulo seleccionado", cantidad: grupo?.items.length ?? 0 };
  }, [grupos, items.length, modulo]);
  const itemsBase = useMemo(() => items
    .filter((item) => modulo === "todos" || item.modulo === modulo)
    .filter((item) => filtro === "todos" || (filtro === "urgentes" && ["vencido", "vencido_hoy"].includes(item.nivel)) || (filtro === "proximos" && ["advertencia", "recordatorio"].includes(item.nivel)))
    .filter((item) => `${item.codigo} ${item.titulo} ${item.grupo} ${item.responsableOperativo} ${accionPendiente(item.modulo)} ${motivoPendiente(item.modulo, item.motivo)}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")))
    .sort((a, b) => NIVEL[a.nivel].orden - NIVEL[b.nivel].orden || (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999)), [items, modulo, filtro, busqueda]);
  const tableroResponsables = useMemo(() => {
    const mapa = new Map<string, ResponsablePendientes>();

    for (const item of itemsBase) {
      const actual = mapa.get(item.responsableOperativo) ?? {
        nombre: item.responsableOperativo,
        total: 0,
        vencidos: 0,
        hoy: 0,
        proximos: 0,
        modulos: [],
      };
      actual.total += 1;
      if (item.nivel === "vencido") actual.vencidos += 1;
      if (item.nivel === "vencido_hoy") actual.hoy += 1;
      if (["advertencia", "recordatorio"].includes(item.nivel)) actual.proximos += 1;
      if (!actual.modulos.includes(item.grupo)) actual.modulos.push(item.grupo);
      mapa.set(item.responsableOperativo, actual);
    }

    return [...mapa.values()].sort((a, b) => b.vencidos - a.vencidos || b.hoy - a.hoy || b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
  }, [itemsBase]);
  const visibles = useMemo(() => responsable === "todos" ? itemsBase : itemsBase.filter((item) => item.responsableOperativo === responsable), [itemsBase, responsable]);

  return <section aria-label="Listado de pendientes">
    <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Buscar pendientes</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, tarea o módulo" className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm" /></label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" aria-label="Filtrar por urgencia">
          {([['todos', 'Todos'], ['urgentes', 'Urgentes'], ['proximos', 'Próximos']] as const).map(([valor, label]) => <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor} className={cn("min-h-9 rounded-md px-3 text-xs font-medium", filtro === valor ? "bg-background shadow-sm" : "text-muted-foreground")}>{label}</button>)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 overflow-hidden">
        <Filter className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">
            Módulo activo: <strong className="font-semibold text-foreground">{moduloActivo?.label ?? "Módulo seleccionado"}</strong>
            <span className="ml-1">({moduloActivo.cantidad})</span>
          </p>
          <div className="overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2">
              <button type="button" onClick={() => setModulo("todos")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs leading-tight transition-colors", modulo === "todos" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>Todos los módulos</button>
              {grupos.map((grupo) => <button key={grupo.modulo} type="button" onClick={() => setModulo(grupo.modulo)} aria-label={`Filtrar módulo: ${grupo.label}`} className={cn("max-w-[15rem] shrink-0 truncate rounded-full border px-3 py-1.5 text-xs leading-tight transition-colors", modulo === grupo.modulo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>{grupo.label} · {grupo.items.length}</button>)}
            </div>
          </div>
        </div>
      </div>
    </div>

    {tableroResponsables.length > 0 && <section aria-label="Tablero por responsable" className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Tablero por responsable</h2>
          <p className="text-xs text-muted-foreground">Agrupa las tareas visibles por responsable operativo o puesto detectado en la asignación.</p>
        </div>
        <span className="text-xs text-muted-foreground">{tableroResponsables.length} responsable{tableroResponsables.length === 1 ? "" : "s"} visible{tableroResponsables.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {tableroResponsables.map((actual) => <button key={actual.nombre} type="button" onClick={() => setResponsable(actual.nombre)} aria-pressed={responsable === actual.nombre} className={cn("min-w-0 rounded-lg border p-3 text-left transition-colors", responsable === actual.nombre ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/60")}>
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{actual.nombre}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{actual.modulos.join(" · ")}</span>
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">{actual.total}</span>
          </span>
          <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">{actual.vencidos} vencidos</span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">{actual.hoy} hoy</span>
            <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">{actual.proximos} próximos</span>
          </span>
        </button>)}
      </div>
      {responsable !== "todos" && <button type="button" onClick={() => setResponsable("todos")} className="mt-3 text-xs font-medium text-primary hover:underline">Ver todos los responsables</button>}
    </section>}

    <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{visibles.length}</strong> tareas visibles</p>{(filtro !== "todos" || modulo !== "todos" || responsable !== "todos" || busqueda) && <button type="button" onClick={() => { setFiltro("todos"); setModulo("todos"); setResponsable("todos"); setBusqueda(""); }} className="text-xs text-primary hover:underline">Limpiar filtros</button>}</div>
    {visibles.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No hay tareas que coincidan con los filtros.</div> : <div className="space-y-2">{visibles.map((item) => {
      const meta = NIVEL[item.nivel];
      const plazo = item.diasRestantes == null ? (item.fechaLimite ? meta.label : "Sin plazo definido") : item.diasRestantes < 0 ? `Vencido hace ${Math.abs(item.diasRestantes)} día${Math.abs(item.diasRestantes) === 1 ? "" : "s"}` : item.diasRestantes === 0 ? "Vence hoy" : `En ${item.diasRestantes} día${item.diasRestantes === 1 ? "" : "s"}`;
      const accion = accionPendiente(item.modulo);
      const motivo = motivoPendiente(item.modulo, item.motivo);
      return <Link key={`${item.modulo}-${item.entidadId}`} href={item.urlDestino} aria-label={`${accion}: ${item.codigo} ${item.titulo}. ${motivo}`} className={cn("group grid min-w-0 gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center", meta.card)}>
        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full sm:mt-0", meta.dot)} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{item.codigo}</span><span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">{item.grupo}</span><span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">{item.responsableOperativo}</span></span>
          <span className="mt-1 block break-words text-sm font-medium leading-snug">{item.titulo}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{fechaLimitePendiente(item.fechaLimite)}</span>
          <span className="mt-3 block rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <span className="block font-semibold text-foreground">Motivo</span>
            <span className="mt-0.5 block break-words">{motivo}</span>
          </span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:max-w-56 sm:justify-end sm:self-start">
          <span className="rounded-full bg-background/80 px-2 py-1 text-xs font-semibold text-muted-foreground">{plazo}</span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">{accion}<ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" /></span>
        </span>
      </Link>;
    })}</div>}
  </section>;
}
