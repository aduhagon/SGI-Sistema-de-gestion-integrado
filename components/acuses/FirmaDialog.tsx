"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, ShieldCheck } from "lucide-react";
import { firmarAcuse, type EstadoFirma } from "@/app/(app)/acuses/actions";
import { Button } from "@/components/ui/button";

type Props = {
  acuseId: string;
  codigo: string;
  titulo: string;
  numeroVersion: string;
  hashArchivo: string | null;
  abierto: boolean;
  onClose: () => void;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="flex-1">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Firmando…
        </>
      ) : (
        <>
          <PenLine className="h-4 w-4" aria-hidden="true" />
          Firmar acuse de lectura
        </>
      )}
    </Button>
  );
}

export function FirmaDialog({
  acuseId,
  codigo,
  titulo,
  numeroVersion,
  hashArchivo,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoFirma, FormData>(firmarAcuse, null);
  const [confirmado, setConfirmado] = useState(false);

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

  useEffect(() => {
    if (!abierto) setConfirmado(false);
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firma-title"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
          </div>
          <h2 id="firma-title" className="font-serif text-2xl font-semibold tracking-tight">
            Firmar acuse de lectura
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {titulo} · versión {numeroVersion}
          </p>

          <form action={formAction} className="mt-6 space-y-5">
            <input type="hidden" name="acuseId" value={acuseId} />

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
              Al firmar, dejás constancia formal de que leíste y tomaste conocimiento de
              esta versión del documento. La firma queda registrada de forma permanente
              con la fecha, tu identidad y la huella del documento.
            </div>

            {hashArchivo && (
              <div className="text-[11px] text-muted-foreground">
                <span className="uppercase tracking-wider">Huella del documento</span>
                <div className="mt-1 break-all font-mono">{hashArchivo}</div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                name="confirmaLectura"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                Confirmo que leí el documento <strong>{codigo}</strong> en su versión{" "}
                {numeroVersion} y tomo conocimiento de su contenido.
              </span>
            </label>

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
              <SubmitButton disabled={!confirmado} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
