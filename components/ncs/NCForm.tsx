"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import type { ProcesoParaAlcance } from "@/lib/api/auditorias";
import { crearNC, type EstadoCrearNC } from "@/app/(app)/ncs/nueva/actions";
import { Button } from "@/components/ui/button";

type HallazgoOpcion = { id: string; codigo: string; titulo: string; tipo: string };

type Props = {
  procesos: ProcesoParaAlcance[];
  hallazgos: HallazgoOpcion[];
};

const ORIGENES = [
  { value: "control_interno", label: "Control interno" },
  { value: "auditoria_interna", label: "Auditoría interna" },
  { value: "auditoria_externa", label: "Auditoría externa" },
  { value: "reclamo_cliente", label: "Reclamo de cliente" },
  { value: "proveedor", label: "Proveedor" },
  { value: "accidente", label: "Accidente" },
  { value: "otro", label: "Otro" },
];

const ORIGENES_AUDITORIA = ["auditoria_interna", "auditoria_externa"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Creando…</>
      ) : (
        <><Save className="h-4 w-4" aria-hidden="true" />Abrir no conformidad</>
      )}
    </Button>
  );
}

export function NCForm({ procesos, hallazgos }: Props) {
  const [estado, formAction] = useFormState<EstadoCrearNC, FormData>(crearNC, null);
  const [origen, setOrigen] = useState("control_interno");
  const [accionInmediata, setAccionInmediata] = useState(false);

  const esAuditoria = ORIGENES_AUDITORIA.includes(origen);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="titulo" className="text-sm font-medium">Título</label>
        <input
          id="titulo" name="titulo" required maxLength={200}
          placeholder="Resumen de la no conformidad"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
        <textarea
          id="descripcion" name="descripcion" rows={3} required
          placeholder="En qué consiste el incumplimiento detectado…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
          <select id="tipo" name="tipo" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="no_conformidad">No conformidad</option>
            <option value="desviacion">Desviación</option>
            <option value="incidente">Incidente</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="severidad" className="text-sm font-medium">Severidad</label>
          <select id="severidad" name="severidad" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="alta">Alta</option>
            <option value="media" selected>Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="origen" className="text-sm font-medium">Origen</label>
          <select
            id="origen" name="origen" value={origen} onChange={(e) => setOrigen(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ORIGENES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {esAuditoria && (
        <div className="space-y-2">
          <label htmlFor="hallazgoId" className="text-sm font-medium">
            Hallazgo de origen
          </label>
          {hallazgos.length > 0 ? (
            <select
              id="hallazgoId" name="hallazgoId" required={esAuditoria}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Elegí el hallazgo…</option>
              {hallazgos.map((h) => (
                <option key={h.id} value={h.id}>{h.codigo} — {h.titulo}</option>
              ))}
            </select>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No hay hallazgos de auditoría sin NC asociada. Registrá primero el hallazgo
              en la auditoría correspondiente, o elegí otro origen.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Las NC de origen auditoría deben vincularse a un hallazgo registrado.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="procesoId" className="text-sm font-medium">
          Proceso afectado <span className="text-muted-foreground">(opcional)</span>
        </label>
        <select id="procesoId" name="procesoId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Sin proceso específico</option>
          {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="fechaLimiteCierre" className="text-sm font-medium">
          Fecha límite de cierre <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="fechaLimiteCierre" name="fechaLimiteCierre" type="date"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
        />
      </div>

      <div className="space-y-3 rounded-md border border-border p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox" name="requiereAccionInmediata"
            checked={accionInmediata} onChange={(e) => setAccionInmediata(e.target.checked)}
            className="h-4 w-4"
          />
          Requiere acción inmediata (contención)
        </label>
        {accionInmediata && (
          <textarea
            name="accionInmediataDescripcion" rows={2} required={accionInmediata}
            placeholder="Qué acción de contención se tomó o se tomará de inmediato…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
      </div>

      {estado && !estado.ok && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {estado.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
