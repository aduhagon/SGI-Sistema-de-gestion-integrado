// Estado de carga para todas las rutas del grupo (app).
// Next lo muestra automáticamente mientras el Server Component
// resuelve sus consultas, evitando la pantalla en blanco.
// Es un esqueleto neutro que imita la estructura común de las páginas
// (encabezado + lista) sin simular contenido concreto.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Encabezado */}
      <div className="mb-8 animate-pulse">
        <div className="mb-3 h-3 w-40 rounded bg-muted" />
        <div className="mb-4 h-9 w-72 max-w-full rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl rounded bg-muted/60" />
      </div>

      {/* Filas de lista */}
      <div className="overflow-hidden rounded-lg border border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0 animate-pulse"
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
            <div className="h-3 w-24 shrink-0 rounded bg-muted" />
            <div className="h-3 flex-1 rounded bg-muted/60" />
            <div className="h-3 w-20 shrink-0 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
