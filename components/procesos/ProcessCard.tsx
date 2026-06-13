import Link from "next/link";
import { ArrowUpRight, FileText, AlertOctagon, Gauge } from "lucide-react";
import { getProcessIcon } from "./icons";

export type ProcessSummary = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion_corta: string | null;
  tipo: "estrategico" | "operativo" | "apoyo";
  color_hex: string | null;
  icono: string | null;
  // Indicadores de salud (opcional: si no se pasan, no se muestran chips).
  salud?: {
    documentos: number;
    ncAbiertas: number;
    indicadores: number;
  };
};

type Props = {
  proceso: ProcessSummary;
};

export function ProcessCard({ proceso }: Props) {
  const Icon = getProcessIcon(proceso.icono);
  const color = proceso.color_hex ?? "#475569";
  const salud = proceso.salud;

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

      {/* Indicadores de salud */}
      {salud && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2">
          <ChipSalud
            icon={FileText}
            valor={salud.documentos}
            etiqueta={salud.documentos === 1 ? "documento" : "documentos"}
            tono="neutro"
          />
          {salud.indicadores > 0 && (
            <ChipSalud
              icon={Gauge}
              valor={salud.indicadores}
              etiqueta={salud.indicadores === 1 ? "indicador" : "indicadores"}
              tono="neutro"
            />
          )}
          {salud.ncAbiertas > 0 && (
            <ChipSalud
              icon={AlertOctagon}
              valor={salud.ncAbiertas}
              etiqueta={salud.ncAbiertas === 1 ? "NC abierta" : "NC abiertas"}
              tono="alerta"
            />
          )}
        </div>
      )}
    </Link>
  );
}

function ChipSalud({
  icon: Icon,
  valor,
  etiqueta,
  tono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  valor: number;
  etiqueta: string;
  tono: "neutro" | "alerta";
}) {
  const clases =
    tono === "alerta"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${clases}`}
      title={`${valor} ${etiqueta}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {valor}
    </span>
  );
}
