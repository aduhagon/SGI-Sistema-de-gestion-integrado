"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import type { Indicador, ProcesoOpcion, PuestoOpcion } from "@/lib/api/indicadores";
import { PERIODICIDAD_LABEL } from "@/lib/indicadores-utils";
import { guardarIndicador, type EstadoIndicador } from "@/app/(app)/indicadores/actions";
import { Button } from "@/components/ui/button";

const PERIODICIDADES = [
  "diaria", "semanal", "quincenal", "mensual", "bimestral", "trimestral", "semestral", "anual", "ad_hoc",
];

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
      ) : (
        <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear indicador"}</>
      )}
    </Button>
  );
}

/**
 * Modal de alta/edición de indicador. Único dueño del formulario.
 * Lo usan tanto el listado (GestionIndicadores) como el detalle del indicador,
 * para no duplicar el form.
 */
export function IndicadorFormModal({
  editando,
  procesos,
  puestos,
  abierto,
  onClose,
  onSaved,
}: {
  editando: Indicador | null;
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
  abierto: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [estado, formAction] = useFormState<EstadoIndicador, FormData>(guardarIndicador, null);
  const [sentido, setSentido] = useState(editando?.sentido ?? "mayor_mejor");

  // Sincronizar el sentido cuando cambia el indicador en edición (al reabrir).
  useEffect(() => {
    if (abierto) setSentido(editando?.sentido ?? "mayor_mejor");
  }, [abierto, editando]);

  useEffect(() => {
    if (estado?.ok) {
      onSaved?.();
      onClose();
    }
  }, [estado, onClose, onSaved]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (abierto) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            {editando ? "Editar indicador" : "Nuevo indicador"}
          </h2>
          <form action={formAction} className="mt-6 space-y-4">
            {editando && <input type="hidden" name="id" value={editando.id} />}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                <input
                  id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""} placeholder="KPI-PROD-01"
                  onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
                  className={INPUT + " font-mono"}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
                <select id="procesoId" name="procesoId" required defaultValue={editando?.procesoId ?? ""} className={INPUT}>
                  <option value="">Elegí un proceso…</option>
                  {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="responsablePuestoId" className="text-sm font-medium">
                  Puesto responsable <span className="text-muted-foreground">(opc.)</span>
                </label>
                <select id="responsablePuestoId" name="responsablePuestoId" defaultValue={editando?.responsablePuestoId ?? ""} className={INPUT}>
                  <option value="">Sin asignar</option>
                  {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opc.)</span></label>
                <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className={INPUT} />
              </div>
              <div className="space-y-2">
                <label htmlFor="formula" className="text-sm font-medium">Fórmula <span className="text-muted-foreground">(opc.)</span></label>
                <textarea id="formula" name="formula" rows={2} defaultValue={editando?.formula ?? ""} placeholder="(unidades OK / total) × 100" className={INPUT} />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Meta y evaluación</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label htmlFor="unidad" className="text-sm font-medium">Unidad</label>
                  <input id="unidad" name="unidad" defaultValue={editando?.unidad ?? ""} placeholder="%, kg, días…" className={INPUT} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label htmlFor="sentido" className="text-sm font-medium">Sentido</label>
                  <select id="sentido" name="sentido" value={sentido} onChange={(e) => setSentido(e.target.value)} className={INPUT}>
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
                    <input id="metaMinima" name="metaMinima" type="number" step="any" defaultValue={editando?.metaMinima ?? ""} className={INPUT} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="metaMaxima" className="text-sm font-medium">Meta máxima</label>
                    <input id="metaMaxima" name="metaMaxima" type="number" step="any" defaultValue={editando?.metaMaxima ?? ""} className={INPUT} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="meta" className="text-sm font-medium">Meta</label>
                  <input id="meta" name="meta" type="number" step="any" defaultValue={editando?.meta ?? ""} className={INPUT} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="periodicidad" className="text-sm font-medium">Periodicidad de medición</label>
              <select id="periodicidad" name="periodicidad" defaultValue={editando?.periodicidad ?? "mensual"} className={INPUT}>
                {PERIODICIDADES.map((p) => <option key={p} value={p}>{PERIODICIDAD_LABEL[p]}</option>)}
              </select>
            </div>

            {estado && !estado.ok && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {estado.error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <SubmitButton edicion={!!editando} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
