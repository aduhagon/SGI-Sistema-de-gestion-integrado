"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, X, Loader2, AlertTriangle } from "lucide-react";
import { aprobarDocumentoAdmin } from "@/app/(app)/documentos/[id]/aprobar-admin-actions";

/**
 * Botón "Aprobar (administrativa)" + diálogo de motivo. Atajo de gestor para
 * poner un documento vigente sin el circuito formal de firmas.
 *
 * Mostrar SOLO para gestores y solo cuando el documento no está vigente/obsoleto
 * (la página decide si renderizarlo).
 */
export function BotonAprobarAdmin({ documentoId }: { documentoId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    if (motivo.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await aprobarDocumentoAdmin(documentoId, motivo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setMotivo("");
          setAbierto(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10"
        title="Aprobar de forma administrativa (sin circuito de firmas)"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Aprobar (admin)
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">Aprobación administrativa</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vas a poner el documento vigente <strong>sin pasar por el circuito de
                  firmas</strong>. Es un atajo para la puesta en marcha. La versión anterior
                  vigente (si la hubiera) quedará obsoleta automáticamente. Queda registrado el
                  motivo.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="motivo-aprob" className="mb-1.5 block text-sm font-medium">
                Motivo de la aprobación administrativa
              </label>
              <textarea
                id="motivo-aprob"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={pending}
                placeholder="Ej: Carga inicial del SGI, circuito de aprobación aún no operativo."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Aprobando…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Confirmar aprobación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
