"use client";

import { useState } from "react";
import { Loader2, FileWarning } from "lucide-react";
import { crearNCDesdeHallazgo } from "@/app/(app)/auditorias/[id]/crear-nc-desde-hallazgo";

/**
 * Botón que crea una NC a partir del hallazgo y redirige a ella.
 * La server action hace el redirect; acá solo manejamos el estado de carga y
 * el caso de error (que la action devuelve sin redirigir).
 */
export function BotonCrearNC({ hallazgoId }: { hallazgoId: string }) {
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    setCreando(true);
    // Si la action tiene éxito hace redirect (no vuelve). Si falla, devuelve error.
    const r = await crearNCDesdeHallazgo(hallazgoId);
    if (r && !r.ok) {
      setError(r.error);
      setCreando(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      <button
        type="button"
        onClick={crear}
        disabled={creando}
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
      >
        {creando ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Creando NC…
          </>
        ) : (
          <>
            <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
            Crear no conformidad
          </>
        )}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
