import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getProcessIcon } from "./icons";

export type ProcessSummary = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion_corta: string | null;
  tipo: "estrategico" | "operativo" | "apoyo";
  color_hex: string | null;
  icono: string | null;
};

type Props = {
  proceso: ProcessSummary;
};

export function ProcessCard({ proceso }: Props) {
  const Icon = getProcessIcon(proceso.icono);
  const color = proceso.color_hex ?? "#475569";

  return (
    <Link
      href={`/procesos/${proceso.codigo}`}
      className="group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/25 hover:shadow-sm"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full opacity-80"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between mb-3 pl-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <ArrowUpRight
          className="h-4 w-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <div className="pl-2 mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {proceso.codigo}
      </div>

      <div className="pl-2 mb-1.5 font-serif text-base font-semibold leading-snug tracking-tight text-foreground">
        {proceso.nombre}
      </div>

      {proceso.descripcion_corta && (
        <p className="pl-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {proceso.descripcion_corta}
        </p>
      )}
    </Link>
  );
}
