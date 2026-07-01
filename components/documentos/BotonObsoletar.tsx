"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, X, Loader2, AlertTriangle } from "lucide-react";
import { obsoletarDocumento } from "@/app/(app)/documentos/[id]/obsoletar-actions";

/**
 * Botón "Obsoletar" + diálogo de motivo. Retira un documento de circulación
 * marcándolo como obsoleto. Sirve tanto para documentos vigentes que se retiran
 * como para borradores que no llegaron a aprobarse y se dejan fuera de uso.
 *
 * La página decide cuándo renderizarlo (solo gestores, y solo si el documento
 * todavía no está obsoleto).
 */
export function BotonObsoletar({
  documentoId,
  esBorrador,
}: {
  documentoId: string;
  esBorrador: boolean;
}) {
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
      const r = await obsoletarDocumento(documentoId, motivo);
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
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        title="Marcar el documento como obsoleto (retirarlo de circulación)"
      >
        <Archive className="h-4 w-4" aria-hidden="true" />
        Obsoletar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">
                  Marcar como obsoleto
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {esBorrador ? (
                    <>
                      Este borrador quedará <strong>fuera de circulación</strong>. No se
                      elimina: seguirá visible como obsoleto y su motivo queda registrado
                      para auditoría. Usalo cuando el borrador no va a avanzar.
                    </>
                  ) : (
                    <>
                      El documento dejará de estar vigente y quedará marcado como{" "}
                      <strong>obsoleto</strong>. El motivo queda registrado para
                      trazabilidad. Esta acción retira el documento de circulación.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="motivo-obsoletar" className="mb-1.5 block text-sm font-medium">
                Motivo
              </label>
              <textarea
                id="motivo-obsoletar"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={pending}
                placeholder={
                  esBorrador
                    ? "Ej: Borrador duplicado / se reemplaza por otro documento / ya no aplica."
                    : "Ej: Reemplazado por nueva versión / proceso discontinuado / cambio normativo."
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
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
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Obsoletando…
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Confirmar
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
