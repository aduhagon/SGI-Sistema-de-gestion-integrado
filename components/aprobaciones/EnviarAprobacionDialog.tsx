"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import type { UsuarioElegible } from "@/lib/api/envio";
import { enviarAAprobacion, type EstadoEnvio } from "@/app/(app)/documentos/[id]/enviar-aprobacion-actions";
import { Button } from "@/components/ui/button";

type Props = {
  documentoId: string;
  versionId: string;
  numeroVersion: string;
  usuarios: UsuarioElegible[];
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
          Enviando…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar a aprobación
        </>
      )}
    </Button>
  );
}

export function EnviarAprobacionDialog({
  documentoId,
  versionId,
  numeroVersion,
  usuarios,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const accion = enviarAAprobacion.bind(null, documentoId);
  const [estado, formAction] = useFormState<EstadoEnvio, FormData>(accion, null);
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");

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

  // Para N2, excluir a quien ya es N1 (y viceversa el usuario lo verá deshabilitado).
  const opcionesN2 = usuarios.filter((u) => u.id !== n1);
  const opcionesN1 = usuarios.filter((u) => u.id !== n2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="envio-title"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="p-6">
          <h2 id="envio-title" className="font-serif text-2xl font-semibold tracking-tight">
            Enviar a aprobación
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Versión {numeroVersion}. Elegí los dos aprobadores. Deben ser personas
            distintas y ninguno puede ser el elaborador del documento.
          </p>

          <form action={formAction} className="mt-6 space-y-5">
            <input type="hidden" name="versionId" value={versionId} />

            <div className="space-y-2">
              <label htmlFor="n1" className="text-sm font-medium">
                Aprobador de nivel 1
              </label>
              <select
                id="n1"
                name="aprobadorN1Id"
                value={n1}
                onChange={(e) => setN1(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Elegí un aprobador…
                </option>
                {opcionesN1.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="n2" className="text-sm font-medium">
                Aprobador de nivel 2
              </label>
              <select
                id="n2"
                name="aprobadorN2Id"
                value={n2}
                onChange={(e) => setN2(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Elegí un aprobador…
                </option>
                {opcionesN2.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                El nivel 2 decide después de que el nivel 1 apruebe.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="plazo" className="text-sm font-medium">
                Plazo objetivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="plazo"
                  name="plazoDias"
                  type="number"
                  min={1}
                  max={90}
                  placeholder="5"
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-sm text-muted-foreground">días desde hoy</span>
              </div>
            </div>

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
              <SubmitButton disabled={!n1 || !n2} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
