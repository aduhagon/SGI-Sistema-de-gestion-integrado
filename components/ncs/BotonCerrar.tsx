"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X, Loader2, Lock } from "lucide-react";

type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

type Props = {
  /** id de la entidad a cerrar */
  entidadId: string;
  /** acción server que cierra: recibe (id, texto) */
  accionCerrar: (id: string, texto: string) => Promise<ResultadoCierre>;
  /** "no conformidad" o "auditoría" — para los textos */
  etiqueta: string;
  /** etiqueta del campo: "Motivo de cierre" o "Conclusiones" */
  campoLabel: string;
  /** placeholder del textarea */
  placeholder: string;
  /** texto explicativo de la validación */
  notaValidacion: string;
};

/**
 * Botón "Cerrar" + diálogo con campo de texto obligatorio. Si la validación
 * estricta de la base falla (acciones/NCs abiertas), muestra el mensaje de error
 * que devuelve la función. Reutilizable para NC y auditoría.
 */
export function BotonCerrar({
  entidadId,
  accionCerrar,
  etiqueta,
  campoLabel,
  placeholder,
  notaValidacion,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    if (texto.trim().length < 5) {
      setError(`${campoLabel} es obligatorio (mínimo 5 caracteres).`);
      return;
    }
    startTransition(async () => {
      const r = await accionCerrar(entidadId, texto);
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
          setTexto("");
          setAbierto(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Cerrar {etiqueta}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <Lock className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">Cerrar {etiqueta}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{notaValidacion}</p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="texto-cierre" className="mb-1.5 block text-sm font-medium">
                {campoLabel}
              </label>
              <textarea
                id="texto-cierre"
                rows={4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={pending}
                placeholder={placeholder}
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
                    Cerrando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Confirmar cierre
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
