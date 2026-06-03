"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import { decidirAprobacion, type EstadoDecision } from "@/app/(app)/aprobaciones/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  aprobacionId: string;
  nivel: 1 | 2;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  abierto: boolean;
  decisionInicial: "aprobado" | "rechazado" | null;
  onClose: () => void;
};

function SubmitButton({ decision }: { decision: "aprobado" | "rechazado" }) {
  const { pending } = useFormStatus();
  const esAprobar = decision === "aprobado";
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={esAprobar ? "default" : "destructive"}
      className="flex-1"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Registrando…
        </>
      ) : esAprobar ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          Confirmar aprobación
        </>
      ) : (
        <>
          <X className="h-4 w-4" aria-hidden="true" />
          Confirmar rechazo
        </>
      )}
    </Button>
  );
}

export function DecisionDialog({
  aprobacionId,
  nivel,
  codigo,
  titulo,
  numeroVersion,
  abierto,
  decisionInicial,
  onClose,
}: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoDecision, FormData>(
    decidirAprobacion,
    null,
  );
  const [decision, setDecision] = useState<"aprobado" | "rechazado">(
    decisionInicial ?? "aprobado",
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (decisionInicial) setDecision(decisionInicial);
  }, [decisionInicial]);

  useEffect(() => {
    if (estado?.ok) {
      onClose();
      router.refresh();
    }
  }, [estado, onClose, router]);

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

  const esRechazo = decision === "rechazado";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-title"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nivel {nivel}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
          </div>
          <h2 id="decision-title" className="font-serif text-2xl font-semibold tracking-tight">
            Decidir aprobación
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {titulo} · versión {numeroVersion}
          </p>

          <form action={formAction} className="mt-6 space-y-5">
            <input type="hidden" name="aprobacionId" value={aprobacionId} />
            <input type="hidden" name="nivel" value={nivel} />
            <input type="hidden" name="decision" value={decision} />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("aprobado")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  decision === "aprobado"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-border hover:border-emerald-300",
                )}
                aria-pressed={decision === "aprobado"}
              >
                <Check
                  className={cn(
                    "h-6 w-6",
                    decision === "aprobado" ? "text-emerald-600" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">Aprobar</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("rechazado")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  decision === "rechazado"
                    ? "border-rose-500 bg-rose-50"
                    : "border-border hover:border-rose-300",
                )}
                aria-pressed={decision === "rechazado"}
              >
                <X
                  className={cn(
                    "h-6 w-6",
                    decision === "rechazado" ? "text-rose-600" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">Rechazar</span>
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="comentario" className="text-sm font-medium">
                Comentario{" "}
                {esRechazo ? (
                  <span className="text-rose-600">(obligatorio para rechazo)</span>
                ) : (
                  <span className="text-muted-foreground">(opcional)</span>
                )}
              </label>
              <textarea
                id="comentario"
                name="comentario"
                rows={4}
                required={esRechazo}
                placeholder={
                  esRechazo
                    ? "Explicá qué debe corregirse antes de volver a enviar a aprobación…"
                    : "Comentario opcional sobre la aprobación…"
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {esRechazo && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Al rechazar, la versión vuelve al elaborador para corregir. La decisión
                  queda registrada de forma permanente e inmutable.
                </span>
              </div>
            )}

            {estado && !estado.ok && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {estado.error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <SubmitButton decision={decision} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
