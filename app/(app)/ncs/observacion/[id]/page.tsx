import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import {
  obtenerObservacionDetalle,
  obtenerPuestosParaObservacion,
} from "@/lib/api/observaciones";
import { FormTratamientoObservacion } from "@/components/ncs/FormTratamientoObservacion";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { formatearFechaCorta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  observacion: "Observación",
  oportunidad_mejora: "Oportunidad de mejora",
};

const SEVERIDAD_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export default async function ObservacionPage({ params }: { params: { id: string } }) {
  const [obs, puestos, zona] = await Promise.all([
    obtenerObservacionDetalle(params.id),
    obtenerPuestosParaObservacion(),
    obtenerZonaHoraria(),
  ]);

  if (!obs) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <Link href="/ncs?vista=observaciones" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a observaciones
      </Link>

      <header className="mb-8">
        <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {TIPO_LABEL[obs.tipo] ?? obs.tipo}
          {obs.severidad && <span className="text-muted-foreground/60">· Severidad {SEVERIDAD_LABEL[obs.severidad] ?? obs.severidad}</span>}
        </p>
        <h1 className="mb-2 font-serif text-2xl sm:text-3xl font-semibold tracking-tight">{obs.titulo}</h1>
        <p className="font-mono text-xs text-muted-foreground">{obs.codigo}</p>
      </header>

      {/* Datos del hallazgo (solo lectura) */}
      <section className="mb-8 space-y-4 rounded-lg border border-border bg-muted/20 p-5">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Descripción</p>
          <p className="text-sm text-foreground/90">{obs.descripcion}</p>
        </div>
        {obs.evidencia && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Evidencia</p>
            <p className="text-sm text-foreground/90">{obs.evidencia}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-x-8 gap-y-2 pt-1 text-xs text-muted-foreground">
          {obs.procesoNombre && <span>Proceso: <span className="text-foreground/80">{obs.procesoNombre}</span></span>}
          {obs.requisitoClausula && <span>Requisito: <span className="font-mono text-foreground/80">{obs.requisitoClausula}</span></span>}
          <span>Detectada: <span className="text-foreground/80">{formatearFechaCorta(obs.detectadoEn, zona)}</span></span>
        </div>
      </section>

      {/* Tratamiento (editable) */}
      <section>
        <h2 className="mb-1 font-serif text-xl font-semibold tracking-tight">Tratamiento</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Seguimiento simple: asigná un responsable, definí la acción y cerrá cuando esté resuelta.
          Las observaciones no requieren análisis de causa raíz.
        </p>
        <FormTratamientoObservacion observacion={obs} puestos={puestos} />
      </section>
    </div>
  );
}
