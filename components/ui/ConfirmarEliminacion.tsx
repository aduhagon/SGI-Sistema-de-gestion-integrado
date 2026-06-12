"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Diálogo reutilizable de confirmación de eliminado.
 *
 * Pensado para el patrón de soft-delete del SGI: toda eliminación pide un
 * motivo (que termina en la columna `eliminado_motivo`) y exige una
 * confirmación explícita antes de ejecutar la acción.
 *
 * Uso típico:
 *   const [aEliminar, setAEliminar] = useState<Riesgo | null>(null);
 *   ...
 *   <ConfirmarEliminacion
 *     abierto={aEliminar !== null}
 *     titulo="Eliminar riesgo"
 *     nombre={aEliminar?.titulo}
 *     onCancelar={() => setAEliminar(null)}
 *     onConfirmar={async (motivo) => {
 *       const r = await eliminarRiesgo(aEliminar!.id, motivo);
 *       if (r?.ok) { setAEliminar(null); router.refresh(); }
 *       return r;
 *     }}
 *   />
 *
 * El callback `onConfirmar` recibe el motivo y debe devolver un objeto con
 * `{ ok: boolean; error?: string }` (o null). Si `ok` es false, el diálogo
 * muestra el error y se mantiene abierto.
 */

type ResultadoAccion = { ok: boolean; error?: string } | null;

type Props = {
  abierto: boolean;
  titulo?: string;
  /** Nombre o identificador legible de lo que se elimina (ej: "R-COM-01 · Demoras"). */
  nombre?: string | null;
  /** Texto explicativo opcional debajo del título. */
  descripcion?: string;
  /** Si el motivo es obligatorio (default: true). */
  motivoRequerido?: boolean;
  /** Cantidad mínima de caracteres del motivo cuando es requerido (default: 5). */
  motivoMinimo?: number;
  /** Etiqueta del botón de confirmación (default: "Eliminar"). */
  etiquetaConfirmar?: string;
  onCancelar: () => void;
  onConfirmar: (motivo: string) => Promise<ResultadoAccion> | ResultadoAccion;
};

export function ConfirmarEliminacion({
  abierto,
  titulo = "Confirmar eliminado",
  nombre,
  descripcion,
  motivoRequerido = true,
  motivoMinimo = 5,
  etiquetaConfirmar = "Eliminar",
  onCancelar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset al abrir/cerrar y foco en el motivo.
  useEffect(() => {
    if (abierto) {
      setMotivo("");
      setError(null);
      setEnviando(false);
      // Pequeño delay para que el foco prenda después del montaje.
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [abierto]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !enviando) onCancelar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, enviando, onCancelar]);

  if (!abierto) return null;

  const motivoLimpio = motivo.trim();
  const motivoValido = !motivoRequerido || motivoLimpio.length >= motivoMinimo;

  async function confirmar() {
    setError(null);
    if (motivoRequerido && motivoLimpio.length < motivoMinimo) {
      setError(`El motivo es obligatorio (mínimo ${motivoMinimo} caracteres).`);
      textareaRef.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const r = await onConfirmar(motivoLimpio);
      if (r && !r.ok) {
        setError(r.error ?? "No se pudo eliminar.");
        setEnviando(false);
        return;
      }
      // Si ok (o null), el padre cierra el diálogo. No reseteamos enviando
      // para evitar un parpadeo del botón durante el unmount.
    } catch (e: any) {
      setError(e?.message ?? "Ocurrió un error al eliminar.");
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-eliminacion-titulo"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => !enviando && onCancelar()}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="confirmar-eliminacion-titulo"
                className="font-serif text-xl font-semibold tracking-tight"
              >
                {titulo}
              </h2>
              {nombre && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{nombre}</p>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {descripcion ??
              "Esta acción marca el registro como eliminado. Queda guardado en el historial con la fecha, el autor y el motivo, y se puede auditar después."}
          </p>

          <div className="mt-4 space-y-2">
            <label htmlFor="motivo-eliminacion" className="text-sm font-medium">
              Motivo del eliminado{" "}
              {motivoRequerido ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(opcional)</span>
              )}
            </label>
            <textarea
              id="motivo-eliminacion"
              ref={textareaRef}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: Reemplazado por una versión nueva / Cargado por error / Ya no aplica."
              disabled={enviando}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancelar}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={confirmar}
              disabled={enviando || !motivoValido}
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {etiquetaConfirmar}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
