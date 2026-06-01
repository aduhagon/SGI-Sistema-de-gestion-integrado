import Link from "next/link";
import { Compass, ChevronLeft } from "lucide-react";

/**
 * Página 404 específica para procesos que no existen.
 *
 * Se dispara cuando se intenta acceder a /procesos/CODIGO_INEXISTENTE.
 * Mantiene la identidad visual del SGI en lugar del 404 genérico de Next.
 */
export default function ProcesoNoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-12 mt-12">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Proceso no encontrado
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight mb-3">
          Este proceso no existe o fue desactivado
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
          El código que ingresaste no corresponde a ningún proceso activo del SGI.
          Verificá la URL o volvé al mapa para consultar la lista completa.
        </p>

        <Link
          href="/procesos"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Ir al mapa de procesos
        </Link>
      </div>
    </div>
  );
}
