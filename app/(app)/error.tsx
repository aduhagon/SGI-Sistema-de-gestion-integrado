"use client";

// Boundary de error para las rutas del grupo (app).
// Next renderiza este componente cuando un Server Component de la ruta
// lanza una excepción (por ejemplo, una consulta a la base que falla).
// Debe ser Client Component y recibe `reset` para reintentar el render.
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Deja traza en la consola del navegador para diagnóstico.
    // Cuando se incorpore monitoreo (Sentry), reportar acá.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-amber-600" aria-hidden="true" />
      <h1 className="mb-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
        No se pudo cargar esta sección
      </h1>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
        Hubo un problema al traer los datos. Probá de nuevo. Si el problema
        persiste, avisá al administrador del SGI.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Reintentar
      </button>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-muted-foreground/60">
          Referencia: {error.digest}
        </p>
      )}
    </div>
  );
}
