"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Gauge, Search, ChevronRight, TrendingUp, TrendingDown, Target } from "lucide-react";
import type { Indicador, ProcesoOpcion, PuestoOpcion, CumplimientoEstado } from "@/lib/api/indicadores";
import { SENTIDO_LABEL, PERIODICIDAD_LABEL } from "@/lib/indicadores-utils";
import { guardarIndicador, eliminarIndicador, type EstadoIndicador } from "@/app/(app)/indicadores/actions";
import { Button } from "@/components/ui/button";

const CUMPL_COLOR: Record<CumplimientoEstado, string> = {
  cumple: "bg-emerald-100 text-emerald-700",
  alerta: "bg-amber-100 text-amber-700",
  incumple: "bg-red-100 text-red-700",
  sin_meta: "bg-muted text-muted-foreground",
};
const CUMPL_LABEL: Record<CumplimientoEstado, string> = {
  cumple: "Cumple", alerta: "Alerta", incumple: "Incumple", sin_meta: "Sin datos",
};

const PERIODICIDADES = ["diaria", "semanal", "quincenal", "mensual", "bimestral", "trimestral", "semestral", "anual", "ad_hoc"];

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear indicador"}</>}
    </Button>
  );
}

export function GestionIndicadores({ indicadores, procesos, puestos }: {
  indicadores: Indicador[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [sentido, setSentido] = useState("mayor_mejor");
  const [estado, formAction] = useFormState<EstadoIndicador, FormData>(guardarIndicador, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrir(i: Indicador | null) {
    setEditando(i);
    setSentido(i ? i.sentido : "mayor_mejor");
    setAbierto(true);
  }

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarIndicador(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return indicadores;
    return indicadores.filter((i) =>
      i.codigo.toLowerCase().includes(q) || i.nombre.toLowerCase().includes(q) || i.procesoNombre.toLowerCase().includes(q),
    );
  }, [filtro, indicadores]);

  function metaTexto(i: Indicador): string {
    if (i.sentido === "rango_optimo") {
      const min = i.metaMinima ?? "—";
      const max = i.metaMaxima ?? "—";
      return `${min} a ${max}${i.unidad ? " " + i.unidad : ""}`;
    }
    if (i.meta === null) return "Sin meta";
    const signo = i.sentido === "mayor_mejor" ? "≥" : "≤";
    return `${signo} ${i.meta}${i.unidad ? " " + i.unidad : ""}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm sm:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por código, nombre o proceso…" className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nuevo indicador</Button>
      </div>

      {filtrados.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Indicador</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Meta</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Último</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center hidden sm:table-cell">Estado</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs align-top">{i.codigo}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/indicadores/${i.id}`} className="font-medium hover:underline">{i.nombre}</Link>
                    <div className="text-xs text-muted-foreground">{i.procesoNombre}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">{metaTexto(i)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {i.ultimoValor !== null ? (
                      <span className="font-medium">{i.ultimoValor}{i.unidad ? <span className="text-xs text-muted-foreground"> {i.unidad}</span> : null}</span>
                    ) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CUMPL_COLOR[i.cumplimiento]}`}>
                      {CUMPL_LABEL[i.cumplimiento]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="flex justify-end gap-1">
                      <Link href={`/indicadores/${i.id}`} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Ver mediciones" aria-label="Ver mediciones">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => abrir(i)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(i.id)} disabled={eliminando === i.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : indicadores.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Ningún indicador coincide con “{filtro}”.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Gauge className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay indicadores definidos</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">Definí los KPIs de cada proceso, con su meta y periodicidad. Después cargás las mediciones período a período.</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar indicador" : "Nuevo indicador"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""} placeholder="KPI-PROD-01"
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                    <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
                    <select id="procesoId" name="procesoId" required defaultValue={editando?.procesoId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Elegí un proceso…</option>
                      {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="responsablePuestoId" className="text-sm font-medium">Puesto responsable <span className="text-muted-foreground">(opc.)</span></label>
                    <select id="responsablePuestoId" name="responsablePuestoId" defaultValue={editando?.responsablePuestoId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Sin asignar</option>
                      {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="formula" className="text-sm font-medium">Fórmula <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="formula" name="formula" rows={2} defaultValue={editando?.formula ?? ""} placeholder="(unidades OK / total) × 100" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Meta y evaluación</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <label htmlFor="unidad" className="text-sm font-medium">Unidad</label>
                      <input id="unidad" name="unidad" defaultValue={editando?.unidad ?? ""} placeholder="%, kg, días…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label htmlFor="sentido" className="text-sm font-medium">Sentido</label>
                      <select id="sentido" name="sentido" value={sentido} onChange={(e) => setSentido(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="mayor_mejor">Mayor es mejor (ej: % cumplimiento)</option>
                        <option value="menor_mejor">Menor es mejor (ej: reclamos, defectos)</option>
                        <option value="rango_optimo">Rango óptimo (entre mínimo y máximo)</option>
                      </select>
                    </div>
                  </div>
                  {sentido === "rango_optimo" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label htmlFor="metaMinima" className="text-sm font-medium">Meta mínima</label>
                        <input id="metaMinima" name="metaMinima" type="number" step="any" defaultValue={editando?.metaMinima ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="metaMaxima" className="text-sm font-medium">Meta máxima</label>
                        <input id="metaMaxima" name="metaMaxima" type="number" step="any" defaultValue={editando?.metaMaxima ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label htmlFor="meta" className="text-sm font-medium">Meta</label>
                      <input id="meta" name="meta" type="number" step="any" defaultValue={editando?.meta ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="periodicidad" className="text-sm font-medium">Periodicidad de medición</label>
                  <select id="periodicidad" name="periodicidad" defaultValue={editando?.periodicidad ?? "mensual"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {PERIODICIDADES.map((p) => <option key={p} value={p}>{PERIODICIDAD_LABEL[p]}</option>)}
                  </select>
                </div>

                {estado && !estado.ok && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton edicion={!!editando} />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
