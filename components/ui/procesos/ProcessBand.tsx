import type { ProcessSummary } from "./ProcessCard";
import { ProcessCard } from "./ProcessCard";

type Props = {
  /** Nombre de la banda (ej: "Procesos estratégicos") */
  titulo: string;
  /** Subtítulo opcional describiendo el rol de la banda en el SGI */
  subtitulo?: string;
  /** Procesos a renderizar en esta banda */
  procesos: ProcessSummary[];
  /** Color hex de acento para la etiqueta lateral */
  colorAcento: string;
};

/**
 * Banda horizontal del mapa de procesos.
 *
 * Renderiza los procesos en una grilla responsiva:
 * - 1 columna en mobile
 * - 2 columnas en tablet
 * - 4 columnas en desktop estándar
 */
export function ProcessBand({ titulo, subtitulo, procesos, colorAcento }: Props) {
  return (
    <section className="relative">
      {/* Etiqueta vertical lateral con el nombre de la banda */}
      <div className="mb-4 flex items-baseline gap-3">
        <span
          className="h-3 w-3 rounded-sm shrink-0 mt-1"
          style={{ backgroundColor: colorAcento }}
          aria-hidden="true"
        />
        <div className="flex-1">
          <h2 className="font-serif text-sm uppercase tracking-[0.25em] text-foreground">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {procesos.length.toString().padStart(2, "0")}
        </span>
      </div>

      {/* Grilla de procesos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {procesos.map((proceso) => (
          <ProcessCard key={proceso.id} proceso={proceso} />
        ))}
      </div>
    </section>
  );
}
