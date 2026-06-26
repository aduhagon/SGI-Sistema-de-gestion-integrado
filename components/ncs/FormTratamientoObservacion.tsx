"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guardarTratamientoObservacion, type EstadoObservacion } from "@/app/(app)/ncs/actions";
import type { ObservacionDetalle, PuestoOpcion } from "@/lib/api/observaciones";

const ESTADOS = [
  { value: "abierto", label: "Abierta" },
  { value: "en_tratamiento", label: "En tratamiento" },
  { value: "cerrado", label: "Cerrada" },
  { value: "aceptado_riesgo", label: "Riesgo aceptado" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />Guardar tratamiento</>}
    </Button>
  );
}

export function FormTratamientoObservacion({
  observacion,
  puestos,
}: {
  observacion: ObservacionDetalle;
  puestos: PuestoOpcion[];
}) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoObservacion, FormData>(
    guardarTratamientoObservacion,
    null,
  );

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={observacion.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="estado" className="text-sm font-medium">Estado</label>
          <select
            id="estado"
            name="estado"
            defaultValue={observacion.estado}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="responsableId" className="text-sm font-medium">Responsable del tratamiento</label>
          <select
            id="responsableId"
            name="responsableId"
            defaultValue={observacion.responsableId ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Sin asignar</option>
            {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="accionTratamiento" className="text-sm font-medium">Acción de tratamiento</label>
        <textarea
          id="accionTratamiento"
          name="accionTratamiento"
          rows={3}
          defaultValue={observacion.accionTratamiento ?? ""}
          placeholder="Qué se va a hacer para atender esta observación…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fechaLimite" className="text-sm font-medium">Fecha límite <span className="text-muted-foreground">(opc.)</span></label>
          <input
            id="fechaLimite"
            name="fechaLimite"
            type="date"
            defaultValue={observacion.fechaLimite ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="motivoCierre" className="text-sm font-medium">
          Motivo de cierre <span className="text-muted-foreground">(requerido al cerrar)</span>
        </label>
        <textarea
          id="motivoCierre"
          name="motivoCierre"
          rows={2}
          defaultValue={observacion.motivoCierre ?? ""}
          placeholder="Cómo se resolvió o por qué se cierra…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {estado && !estado.ok && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {estado.error}
        </div>
      )}
      {estado?.ok && (
        <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Tratamiento guardado.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
