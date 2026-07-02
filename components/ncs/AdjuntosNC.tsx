"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Paperclip, Loader2, Plus, X, Download, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import type { AdjuntoNC } from "@/lib/api/adjuntos-nc";
import { subirAdjuntoNC, quitarAdjuntoNC, type EstadoAdjunto } from "@/app/(app)/ncs/[id]/adjunto-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Props = {
  ncId: string;
  adjuntos: AdjuntoNC[];
  puedeAdjuntar: boolean;
};

function fmtTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function esImagen(mime: string) {
  return mime.startsWith("image/");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Subiendo…</> : <><Plus className="h-4 w-4" />Adjuntar</>}
    </Button>
  );
}

export function AdjuntosNCSection({ ncId, adjuntos, puedeAdjuntar }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useFormState<EstadoAdjunto, FormData>(subirAdjuntoNC, null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [quitando, setQuitando] = useState<string | null>(null);

  useEffect(() => {
    if (estado?.ok) {
      setAbierto(false);
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }, [estado, router]);

  async function quitar(id: string) {
    setQuitando(id);
    const r = await quitarAdjuntoNC(ncId, id);
    setQuitando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />Evidencia del problema {adjuntos.length > 0 && `(${adjuntos.length})`}
        </h2>
        {puedeAdjuntar && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            <Plus className="h-3.5 w-3.5" />Adjuntar
          </Button>
        )}
      </div>

      {adjuntos.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {adjuntos.map((a) => {
            const Icon = esImagen(a.mimeType) ? ImageIcon : FileText;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.extension.toUpperCase()} · {fmtTamano(a.tamanoBytes)}
                  </div>
                </div>
                <a
                  href={`/api/archivos/${a.id}/descargar`}
                  className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Descargar"
                  aria-label="Descargar"
                >
                  <Download className="h-4 w-4" />
                </a>
                {puedeAdjuntar && (
                  <button
                    type="button"
                    onClick={() => quitar(a.id)}
                    disabled={quitando === a.id}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Quitar"
                    aria-label="Quitar"
                  >
                    {quitando === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {puedeAdjuntar
            ? "Sin adjuntos. Subí fotos, el reclamo, informes u otra evidencia del problema."
            : "Sin adjuntos de evidencia del problema."}
        </p>
      )}

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-md">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Adjuntar evidencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subí evidencia del problema: fotos, el reclamo del cliente, un informe, etc. (máx. 20 MB).
          </p>
        </ModalHeader>
        <form action={formAction} className={MODAL_FORM_CLASS}>
          <ModalBody className="space-y-4">
            <input type="hidden" name="noConformidadId" value={ncId} />

                {archivo ? (
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{archivo.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtTamano(archivo.size)}</span>
                    </span>
                    <button type="button" onClick={() => { setArchivo(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Quitar archivo">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="archivo" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:bg-muted/30">
                    <Paperclip className="h-4 w-4" />
                    Elegir archivo (PDF, imagen, etc.)
                  </label>
                )}
                <input
                  ref={fileRef}
                  id="archivo"
                  name="archivo"
                  type="file"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />

            <div className="pb-2" />
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
              <SubmitButton />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </section>
  );
}
