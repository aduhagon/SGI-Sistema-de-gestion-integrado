"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Download, Loader2, Plus, X, Trash2 } from "lucide-react";
import type { AdjuntoHallazgo } from "@/lib/api/adjuntos-hallazgo";
import {
  subirAdjuntoHallazgo, quitarAdjuntoHallazgo,
} from "@/app/(app)/auditorias/[id]/adjunto-hallazgo-actions";

function fmtTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Props = {
  auditoriaId: string;
  hallazgoId: string;
  adjuntos: AdjuntoHallazgo[];
  puedeAdjuntar: boolean;
};

export function AdjuntosHallazgo({ auditoriaId, hallazgoId, adjuntos, puedeAdjuntar }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);
    const fd = new FormData();
    fd.set("auditoriaId", auditoriaId);
    fd.set("hallazgoId", hallazgoId);
    fd.set("archivo", file);
    const r = await subirAdjuntoHallazgo(null, fd);
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
    if (r && !r.ok) { setError(r.error); return; }
    router.refresh();
  }

  async function quitar(id: string) {
    setQuitando(id);
    const r = await quitarAdjuntoHallazgo(auditoriaId, id);
    setQuitando(null);
    if (r && !r.ok) { setError(r.error); return; }
    router.refresh();
  }

  if (adjuntos.length === 0 && !puedeAdjuntar) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {adjuntos.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
            <Paperclip className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <a
              href={`/api/archivos/${a.id}/descargar`}
              className="max-w-[180px] truncate text-foreground hover:underline"
              title={`${a.nombre} · ${fmtTamano(a.tamanoBytes)}`}
            >
              {a.nombre}
            </a>
            <a href={`/api/archivos/${a.id}/descargar`} className="text-muted-foreground hover:text-foreground" aria-label="Descargar">
              <Download className="h-3 w-3" />
            </a>
            {puedeAdjuntar && (
              <button
                type="button" onClick={() => quitar(a.id)} disabled={quitando === a.id}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50" aria-label="Quitar"
              >
                {quitando === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            )}
          </span>
        ))}

        {puedeAdjuntar && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={onArchivo} />
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={subiendo}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {subiendo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Adjuntar documentación
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
