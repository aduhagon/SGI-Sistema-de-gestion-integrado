"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { reabrirVersionRechazada } from "@/app/(app)/documentos/[id]/reabrir-actions";

/**
 * Botón "Reabrir para corregir" en una versión rechazada. Vuelve la versión a
 * borrador para corregir el archivo y reenviar a aprobación. El historial del
 * rechazo queda registrado de forma permanente.
 */
export function BotonReabrirRechazado({
  documentoId,
  versionId,
}: {
  documentoId: string;
  versionId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reabrir() {
    setError(null);
    startTransition(async () => {
      const r = await reabrirVersionRechazada(documentoId, versionId);
      if (!r || !r.ok) {
        setError(r?.error ?? "No se pudo reabrir la versión.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={reabrir}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Reabriendo…</>
        ) : (
          <><RotateCcw className="h-4 w-4" aria-hidden="true" />Reabrir para corregir</>
        )}
      </button>
      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
