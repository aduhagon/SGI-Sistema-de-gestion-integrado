import type { ProcessSummary } from "./ProcessCard";
import { ProcessCard } from "./ProcessCard";

type Props = {
  titulo: string;
  subtitulo?: string;
  procesos: ProcessSummary[];
  colorAcento: string;
};

export function ProcessBand({ titulo, subtitulo, procesos, colorAcento }: Props) {
  return (
    <section className="relative">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {procesos.map((proceso) => (
          <ProcessCard key={proceso.id} proceso={proceso} />
        ))}
      </div>
    </section>
  );
}
