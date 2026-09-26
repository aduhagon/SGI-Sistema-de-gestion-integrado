"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalBody, ModalError, ModalFooter, ModalHeader, ModalShell } from "@/components/ui/modal";

export function ConfirmActionDialog({
  abierto,
  titulo,
  registro,
  descripcion,
  confirmLabel = "Eliminar",
  procesando = false,
  error,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  registro: string;
  descripcion: string;
  confirmLabel?: string;
  procesando?: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <ModalShell abierto={abierto} onClose={() => { if (!procesando) onCancelar(); }} maxWidth="max-w-md">
      <ModalHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 className="font-serif text-xl font-semibold tracking-tight">{titulo}</h2><p className="mt-1 text-sm text-muted-foreground">Revisá el registro antes de continuar.</p></div>
        </div>
      </ModalHeader>
      <ModalBody className="space-y-3 pb-4">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium">{registro}</div>
        <p className="text-sm leading-6 text-muted-foreground">{descripcion}</p>
      </ModalBody>
      <ModalFooter>
        <ModalError mensaje={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={procesando} onClick={onCancelar}>Conservar registro</Button>
          <Button type="button" variant="destructive" disabled={procesando} onClick={onConfirmar}>{procesando ? <><Loader2 className="h-4 w-4 animate-spin" />Procesando…</> : confirmLabel}</Button>
        </div>
      </ModalFooter>
    </ModalShell>
  );
}
