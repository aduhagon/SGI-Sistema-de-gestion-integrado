"use client";

import { useState, useEffect } from "react";
import { Eye, X, Download, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Botón "Ver" + modal con visor embebido del archivo.
 *
 * Usa la ruta existente /api/archivos/[id]/descargar?modo=ver, que genera una
 * URL firmada inline (RLS aplicada). PDF se muestra en <iframe>; imágenes en
 * <img>. Word/Excel no son visualizables embebidos (no llega a montarse el
 * botón porque la página solo lo renderiza si `visualizable` es true).
 */

type Props = {
  archivoId: string;
  mimeType: string;
  nombreOriginal: string;
};

export function VisorDocumento({ archivoId, mimeType, nombreOriginal }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);

  const urlVer = `/api/archivos/${archivoId}/descargar?modo=ver`;
  const urlDescargar = `/api/archivos/${archivoId}/descargar`;
  const esImagen = mimeType.startsWith("image/");
  const esPdf = mimeType === "application/pdf";

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    setCargando(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title={`Ver ${nombreOriginal}`}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Ver
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-foreground/60 backdrop-blur-sm p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Visor de ${nombreOriginal}`}
        >
          {/* Barra superior */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2 text-sm text-background">
              <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate font-medium">{nombreOriginal}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={urlVer}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background/10 px-2.5 py-1.5 text-xs font-medium text-background transition-colors hover:bg-background/20"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Pestaña nueva</span>
              </a>
              <a
                href={urlDescargar}
                className="inline-flex items-center gap-1.5 rounded-md bg-background/10 px-2.5 py-1.5 text-xs font-medium text-background transition-colors hover:bg-background/20"
                title="Descargar"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background/90"
                title="Cerrar (Esc)"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido del visor */}
          <div className="relative flex-1 overflow-hidden rounded-lg bg-card">
            {cargando && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}

            {esPdf && (
              <iframe
                src={urlVer}
                title={nombreOriginal}
                className="h-full w-full border-0"
                onLoad={() => setCargando(false)}
              />
            )}

            {esImagen && (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlVer}
                  alt={nombreOriginal}
                  className="max-h-full max-w-full object-contain"
                  onLoad={() => setCargando(false)}
                />
              </div>
            )}

            {!esPdf && !esImagen && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Este formato no se puede previsualizar en pantalla.
                </p>
                <a href={urlDescargar} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Descargar para verlo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
