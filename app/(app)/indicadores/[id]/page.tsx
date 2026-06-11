import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Gauge } from "lucide-react";
import { obtenerIndicador, listarMediciones } from "@/lib/api/indicadores";
import { SENTIDO_LABEL, PERIODICIDAD_LABEL } from "@/lib/indicadores-utils";
import { GestionMediciones } from "@/components/indicadores/GestionMediciones";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function IndicadorDetallePage({ params }: Props) {
  const indicador = await obtenerIndicador(params.id);
  if (!indicador) notFound();

  const mediciones = await listarMediciones(params.id);

  function metaTexto(): string {
    if (indicador!.sentido === "rango_optimo") {
      return `${indicador!.metaMinima ?? "—"} a ${indicador!.metaMaxima ?? "—"}${indicador!.unidad ? " " + indicador!.unidad : ""}`;
    }
    if (indicador!.meta === null) return "Sin meta definida";
    const signo = indicador!.sentido === "mayor_mejor" ? "≥" : "≤";
    return `${signo} ${indicador!.meta}${indicador!.unidad ? " " + indicador!.unidad : ""}`;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/indicadores" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a indicadores
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{indicador.codigo}</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{indicador.nombre}</h1>
          </div>
        </div>
        {indicador.descripcion && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{indicador.descripcion}</p>}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Proceso: <span className="text-foreground">{indicador.procesoNombre}</span></span>
          <span className="text-muted-foreground">Meta: <span className="text-foreground">{metaTexto()}</span></span>
          <span className="text-muted-foreground">Sentido: <span className="text-foreground">{SENTIDO_LABEL[indicador.sentido]}</span></span>
          <span className="text-muted-foreground">Periodicidad: <span className="text-foreground">{PERIODICIDAD_LABEL[indicador.periodicidad]}</span></span>
          {indicador.responsablePuestoNombre && <span className="text-muted-foreground">Responsable: <span className="text-foreground">{indicador.responsablePuestoNombre}</span></span>}
        </div>
        {indicador.formula && (
          <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Fórmula: </span><span className="font-mono">{indicador.formula}</span>
          </div>
        )}
      </header>

      <GestionMediciones
        indicadorId={indicador.id}
        mediciones={mediciones}
        meta={indicador.sentido === "rango_optimo" ? null : indicador.meta}
        unidad={indicador.unidad}
      />
    </div>
  );
}
