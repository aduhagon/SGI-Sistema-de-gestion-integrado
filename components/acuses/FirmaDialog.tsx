"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, ShieldCheck } from "lucide-react";
import { firmarAcuse, type EstadoFirma } from "@/app/(app)/acuses/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

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
    if (!abierto) setConfirmado(false);
  }, [abierto]);

  return (
    <ModalShell abierto={abierto} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader>
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
      </ModalHeader>

      <form action={formAction} className={MODAL_FORM_CLASS}>
        <ModalBody className="space-y-5">
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

            <div className="pb-1" />
        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton disabled={!confirmado} />
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
