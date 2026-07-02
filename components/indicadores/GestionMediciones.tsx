"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save, LineChart } from "lucide-react";
import type { Medicion, CumplimientoEstado } from "@/lib/api/indicadores";
import { registrarMedicion, eliminarMedicion, type EstadoMedicion } from "@/app/(app)/indicadores/[id]/medicion-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

const CUMPL_COLOR: Record<CumplimientoEstado, string> = {
  cumple: "bg-emerald-100 text-emerald-700",
  alerta: "bg-amber-100 text-amber-700",
  incumple: "bg-red-100 text-red-700",
  sin_meta: "bg-muted text-muted-foreground",
};
const CUMPL_LABEL: Record<CumplimientoEstado, string> = {
  cumple: "Cumple", alerta: "Alerta", incumple: "Incumple", sin_meta: "—",
};
const PUNTO_COLOR: Record<CumplimientoEstado, string> = {
  cumple: "fill-emerald-500",
  alerta: "fill-amber-500",
  incumple: "fill-red-500",
  sin_meta: "fill-muted-foreground",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />Registrar</>}
    </Button>
  );
}

function fmtPeriodo(f: string): string {
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

// Mini gráfico de líneas (SVG) de la evolución, más viejo a más nuevo.
function MiniGrafico({ mediciones, meta }: { mediciones: Medicion[]; meta: number | null }) {
  if (mediciones.length < 2) return null;
  const orden = [...mediciones].reverse(); // cronológico ascendente
  const valores = orden.map((m) => m.valor);
  const todos = meta !== null ? [...valores, meta] : valores;
  const min = Math.min(...todos);
  const max = Math.max(...todos);
  const rango = max - min || 1;
  const W = 600, H = 120, pad = 10;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (orden.length - 1);
  const y = (v: number) => H - pad - ((v - min) / rango) * (H - 2 * pad);

  const linea = orden.map((m, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(m.valor)}`).join(" ");
  const metaY = meta !== null ? y(meta) : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <LineChart className="h-3.5 w-3.5" />Evolución
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ maxHeight: 140 }}>
        {metaY !== null && (
          <line x1={pad} y1={metaY} x2={W - pad} y2={metaY} stroke="currentColor" strokeDasharray="4 4" className="text-muted-foreground/40" strokeWidth={1} />
        )}
        <path d={linea} fill="none" stroke="currentColor" className="text-foreground/60" strokeWidth={2} />
        {orden.map((m, i) => (
          <circle key={m.id} cx={x(i)} cy={y(m.valor)} r={3.5} className={PUNTO_COLOR[m.cumplimiento]} />
        ))}
      </svg>
      {meta !== null && <p className="mt-1 text-[11px] text-muted-foreground">La línea punteada es la meta ({meta}).</p>}
    </div>
  );
}

export function GestionMediciones({ indicadorId, mediciones, meta, unidad }: {
  indicadorId: string;
  mediciones: Medicion[];
  meta: number | null;
  unidad: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoMedicion, FormData>(registrarMedicion, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarMedicion(id, indicadorId);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <MiniGrafico mediciones={mediciones} meta={meta} />

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Mediciones</h2>
        <Button size="sm" onClick={() => setAbierto(true)}><Plus className="h-4 w-4" />Registrar medición</Button>
      </div>

      {mediciones.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Período</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center hidden sm:table-cell">Estado</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Comentario</th>
                <th className="px-4 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {mediciones.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">{fmtPeriodo(m.periodo)}</td>
                  <td className="px-4 py-2.5 font-medium">{m.valor}{unidad ? <span className="text-xs text-muted-foreground"> {unidad}</span> : null}</td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CUMPL_COLOR[m.cumplimiento]}`}>{CUMPL_LABEL[m.cumplimiento]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">{m.comentario ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => quitar(m.id)} disabled={eliminando === m.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                      {eliminando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm font-medium">Sin mediciones todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">Registrá el primer valor para empezar a ver la evolución.</p>
        </div>
      )}

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-md">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Registrar medición</h2>
        </ModalHeader>
        <form action={formAction} className={MODAL_FORM_CLASS}>
          <ModalBody className="space-y-4">
            <input type="hidden" name="indicadorId" value={indicadorId} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="periodo" className="text-sm font-medium">Período</label>
                <input id="periodo" name="periodo" type="date" required defaultValue={hoy} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <label htmlFor="valor" className="text-sm font-medium">Valor {unidad ? <span className="text-muted-foreground">({unidad})</span> : null}</label>
                <input id="valor" name="valor" type="number" step="any" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            <div className="space-y-2 pb-3">
              <label htmlFor="comentario" className="text-sm font-medium">Comentario <span className="text-muted-foreground">(opcional)</span></label>
              <textarea id="comentario" name="comentario" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
              <div className="flex-1"><SubmitButton /></div>
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </div>
  );
}
