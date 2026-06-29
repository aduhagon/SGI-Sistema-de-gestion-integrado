"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";
import { adjuntarArchivo } from "@/app/(app)/documentos/[id]/adjuntar-archivo-actions";

/**
 * Botón para adjuntar (o reemplazar) el archivo principal de una versión en
 * borrador, sin crear una versión nueva. Lo usa el detalle del documento cuando
 * el borrador todavía no tiene archivo, o cuando se reabrió tras un rechazo.
 */
export function BotonAdjuntarArchivo({
  documentoId,
  tieneArchivo = false,
}: {
  documentoId: string;
  tieneArchivo?: boolean;
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    setArchivo(f ?? null);
  }

  function quitar() {
    setArchivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function subir() {
    if (!archivo) {
      setError("Elegí un archivo para adjuntar.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("archivo", archivo);
    startTransition(async () => {
      const r = await adjuntarArchivo(documentoId, null, formData);
      if (!r || !r.ok) {
        setError(r?.error ?? "No se pudo adjuntar el archivo.");
        return;
      }
      setArchivo(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!archivo ? (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8">
          <label htmlFor="adjuntar-input" className="flex cursor-pointer flex-col items-center text-center">
            <Upload className="mb-2 h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <span className="mb-1 text-sm font-medium text-foreground">
              {tieneArchivo ? "Reemplazar el archivo" : "Adjuntar el archivo principal"}
            </span>
            <span className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint o imágenes · hasta 50 MB</span>
            <input
              ref={inputRef}
              id="adjuntar-input"
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
              onChange={elegir}
              disabled={pending}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Upload className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{archivo.name}</div>
            <div className="text-xs text-muted-foreground">
              {(archivo.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            type="button"
            onClick={quitar}
            disabled={pending}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Quitar archivo"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {archivo && (
        <button
          type="button"
          onClick={subir}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Subiendo…</>
          ) : (
            <><Upload className="h-4 w-4" aria-hidden="true" />Subir archivo</>
          )}
        </button>
      )}
    </div>
  );
}
