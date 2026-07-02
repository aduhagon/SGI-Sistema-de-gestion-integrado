"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X, Loader2, Lock, ShieldAlert } from "lucide-react";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError } from "@/components/ui/modal";

type ResultadoCierre =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; requiereForzar?: boolean };

type Props = {
  entidadId: string;
  /** acción server que cierra: (id, texto, forzar?). El 3er arg es opcional
   *  y solo lo usa NC; auditoría lo ignora. */
  accionCerrar: (id: string, texto: string, forzar?: boolean) => Promise<ResultadoCierre>;
  etiqueta: string;
  campoLabel: string;
  placeholder: string;
  notaValidacion: string;
};

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
  const [puedeForzar, setPuedeForzar] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setTexto("");
    setPuedeForzar(false);
  }

  function ejecutar(forzar: boolean) {
    setError(null);
    if (texto.trim().length < 5) {
      setError(`${campoLabel} es obligatorio (mínimo 5 caracteres).`);
      return;
    }
    startTransition(async () => {
      const r = await accionCerrar(entidadId, texto, forzar);
      if (!r.ok) {
        setError(r.error);
        // Si la base indica que falta eficacia, habilitamos el forzado (SGI).
        setPuedeForzar(!!r.requiereForzar);
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
        onClick={() => { reset(); setAbierto(true); }}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Cerrar {etiqueta}
      </button>

      <ModalShell abierto={abierto} onClose={() => { if (!pending) setAbierto(false); }} maxWidth="max-w-md">
        <ModalHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <Lock className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold">Cerrar {etiqueta}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{notaValidacion}</p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="pb-3">
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
        </ModalBody>

        <ModalFooter>
          <ModalError mensaje={error} />

          {puedeForzar && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Esta NC no tiene una verificación de eficacia con resultado eficaz.
                Como responsable del SGI podés forzar el cierre: la justificación que
                escribiste quedará registrada como cierre forzado.
              </span>
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

            {puedeForzar ? (
              <button
                type="button"
                onClick={() => ejecutar(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Forzando…</>
                  : <><ShieldAlert className="h-4 w-4" aria-hidden="true" />Forzar cierre (SGI)</>}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => ejecutar(false)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Cerrando…</>
                  : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirmar cierre</>}
              </button>
            )}
          </div>
        </ModalFooter>
      </ModalShell>
    </>
  );
}
