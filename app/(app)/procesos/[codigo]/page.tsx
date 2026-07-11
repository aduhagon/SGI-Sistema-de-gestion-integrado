import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, Plus, Workflow } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listarDocumentosPorProceso } from "@/lib/api/documentos";
import { listarNCsPorProceso } from "@/lib/api/ncs";
import { listarRiesgos } from "@/lib/api/riesgos";
import { listarIndicadores } from "@/lib/api/indicadores";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProcessIcon } from "@/components/procesos/icons";
import { DocumentRow } from "@/components/documentos/DocumentRow";
import { PerfilesProceso } from "@/components/procesos/PerfilesProceso";
import { SenalesProceso } from "@/components/procesos/SenalesProceso";
import { IntegracionErpProceso } from "@/components/procesos/IntegracionErpProceso";
import { obtenerParticipacionesDeProceso } from "@/lib/api/participaciones";
import { listarFormulariosErpDeProceso } from "@/lib/api/integracionErp";

const TIPO_LABEL: Record<string, string> = {
  estrategico: "Proceso estratégico",
  operativo: "Proceso operativo",
  apoyo: "Proceso de apoyo",
};

type Props = {
  params: { codigo: string };
};

export default async function ProcesoDetallePage({ params }: Props) {
  const codigo = decodeURIComponent(params.codigo).toUpperCase();
  const supabase = createClient();

  const [{ data: proceso, error }, documentos] = await Promise.all([
    supabase
      .from("procesos")
      .select(
        "id, codigo, nombre, descripcion, descripcion_corta, tipo, color_hex, icono, objetivo, entradas, salidas",
      )
      .eq("codigo", codigo)
      .eq("activo", true)
      .maybeSingle(),
    listarDocumentosPorProceso(codigo),
  ]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive mb-2">
            Error al cargar el proceso
          </h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!proceso) {
    notFound();
  }

  const [participaciones, ncs, riesgos, indicadores, formulariosErp] = await Promise.all([
    obtenerParticipacionesDeProceso(proceso.id),
    listarNCsPorProceso(proceso.id),
    listarRiesgos(proceso.id),
    listarIndicadores(proceso.id),
    listarFormulariosErpDeProceso(proceso.id),
  ]);

  // ¿Este proceso del SGI tiene un flujograma vinculado?
  const { data: nodoFlujo } = await supabase
    .from("flujo_nodo")
    .select("id")
    .eq("nivel", "proceso")
    .eq("proceso_id", proceso.id)
    .limit(1)
    .maybeSingle();
  const tieneFlujograma = Boolean(nodoFlujo);

  const Icon = getProcessIcon(proceso.icono);
  const color = proceso.color_hex ?? "#475569";
  const tipoLabel = TIPO_LABEL[proceso.tipo] ?? proceso.tipo;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/procesos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al mapa de procesos
        </Link>
      </nav>

      <header className="mb-10 flex flex-col sm:flex-row gap-6 items-start">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="h-9 w-9" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono">
              {proceso.codigo}
            </Badge>
            <Badge variant="muted">{tipoLabel}</Badge>
          </div>
          {tieneFlujograma && (
            <Link
              href={`/flujogramas?proceso=${proceso.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mb-2 gap-1.5")}
            >
              <Workflow className="h-4 w-4" aria-hidden="true" />
              Ver flujograma
            </Link>
          )}
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3 leading-tight">
            {proceso.nombre}
          </h1>
          {proceso.descripcion_corta && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {proceso.descripcion_corta}
            </p>
          )}
        </div>
      </header>

      {proceso.descripcion && (
        <section className="mb-10">
          <p className="text-base leading-relaxed text-foreground/90">
            {proceso.descripcion}
          </p>
        </section>
      )}

      {proceso.objetivo && (
        <section className="mb-10">
          <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Objetivo
          </h2>
          <div className="rounded-lg border-l-2 border-primary bg-primary/5 px-5 py-4">
            <p className="font-serif text-lg leading-relaxed italic text-foreground">
              {proceso.objetivo}
            </p>
          </div>
        </section>
      )}

      {(proceso.entradas || proceso.salidas) && (
        <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {proceso.entradas && (
            <FlowBox
              titulo="Entradas"
              descripcion="Lo que recibe el proceso para operar"
              contenido={proceso.entradas}
              align="left"
            />
          )}
          {proceso.salidas && (
            <FlowBox
              titulo="Salidas"
              descripcion="Lo que el proceso produce o entrega"
              contenido={proceso.salidas}
              align="right"
            />
          )}
        </section>
      )}

      <SenalesProceso ncs={ncs} riesgos={riesgos} indicadores={indicadores} />

      <IntegracionErpProceso codigoProceso={proceso.codigo} formularios={formulariosErp} />

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Documentos asociados
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {documentos.length === 0
                ? "Todavía no hay documentos cargados para este proceso."
                : `${documentos.length} ${documentos.length === 1 ? "documento" : "documentos"} en este proceso.`}
            </p>
          </div>
          <Link
            href="/documentos/nuevo"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nuevo
          </Link>
        </div>

        {documentos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Cargá el primer documento de este proceso para empezar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {documentos.map((doc) => (
              <DocumentRow key={doc.id} documento={doc} />
            ))}
          </div>
        )}
      </section>

      <PerfilesProceso participaciones={participaciones} />
    </div>
  );
}

function FlowBox({
  titulo,
  descripcion,
  contenido,
  align,
}: {
  titulo: string;
  descripcion: string;
  contenido: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-5 ${
        align === "right" ? "md:text-right" : ""
      }`}
    >
      <h3 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {titulo}
      </h3>
      <p className="text-[11px] text-muted-foreground mb-3">{descripcion}</p>
      <p className="text-sm leading-relaxed text-foreground">{contenido}</p>
    </div>
  );
}
