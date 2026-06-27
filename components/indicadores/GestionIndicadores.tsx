"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Gauge, Search, ChevronRight } from "lucide-react";
import type { Indicador, ProcesoOpcion, PuestoOpcion, CumplimientoEstado } from "@/lib/api/indicadores";
import { eliminarIndicador } from "@/app/(app)/indicadores/actions";
import { IndicadorFormModal } from "@/components/indicadores/IndicadorFormModal";
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

  function abrir(i: Indicador | null) {
    setEditando(i);
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

      <IndicadorFormModal
        editando={editando}
        procesos={procesos}
        puestos={puestos}
        abierto={abierto}
        onClose={() => { setAbierto(false); setEditando(null); }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
