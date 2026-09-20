"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Control } from "@/lib/api/controles";
import { registrarEjecucionControl, type EstadoControlAction } from "@/app/(app)/controles/actions";
import { Button } from "@/components/ui/button";
import {
  ModalBody,
  ModalError,
  ModalFooter,
  ModalHeader,
  ModalShell,
  MODAL_FORM_CLASS,
} from "@/components/ui/modal";

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando…</> : <><CheckCircle2 className="h-4 w-4" />Registrar ejecución</>}
    </Button>
  );
}

export function EjecucionControlModal({
  control,
  onClose,
  onSaved,
}: {
  control: Control;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, formAction] = useFormState<EstadoControlAction, FormData>(registrarEjecucionControl, null);

  useEffect(() => {
    if (estado?.ok) {
      onSaved();
      onClose();
    }
  }, [estado, onClose, onSaved]);

  return (
    <ModalShell abierto onClose={onClose} maxWidth="max-w-xl">
      <ModalHeader>
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{control.codigo}</p>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">{control.nombre}</h2>
          </div>
        </div>
      </ModalHeader>

      <form action={formAction} className={MODAL_FORM_CLASS}>
        <ModalBody className="space-y-4 pb-3">
          <input type="hidden" name="controlId" value={control.id} />
          <input type="hidden" name="fechaProgramada" value={control.proximaEjecucion ?? ""} />

          {control.instrucciones && (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Instrucciones</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{control.instrucciones}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="resultado" className="text-sm font-medium">Resultado</label>
              <select id="resultado" name="resultado" defaultValue="efectivo" className={INPUT}>
                <option value="efectivo">Efectivo</option>
                <option value="parcial">Parcialmente efectivo</option>
                <option value="inefectivo">Inefectivo</option>
                <option value="no_aplica">No aplica en esta ejecución</option>
              </select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Fecha programada</span>
              <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                {control.proximaEjecucion ?? "Sin fecha programada"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="detalle" className="text-sm font-medium">Detalle <span className="text-muted-foreground">(opc.)</span></label>
            <textarea id="detalle" name="detalle" rows={3} className={INPUT} placeholder="Qué se revisó y qué resultado se obtuvo" />
          </div>

          <div className="space-y-2">
            <label htmlFor="evidenciaDescripcion" className="text-sm font-medium">
              Evidencia {control.requiereEvidencia ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(opc.)</span>}
            </label>
            <textarea
              id="evidenciaDescripcion"
              name="evidenciaDescripcion"
              rows={3}
              required={control.requiereEvidencia}
              minLength={control.requiereEvidencia ? 5 : undefined}
              className={INPUT}
              placeholder="Registro, orden de compra, acta o dato comprobado"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <SubmitButton />
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
