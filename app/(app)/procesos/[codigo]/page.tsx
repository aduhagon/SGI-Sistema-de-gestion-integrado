import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProcessIcon } from "@/components/procesos/icons";

/**
 * Mapeo de tipo de proceso a label legible para humanos.
 */
const TIPO_LABEL: Record<string, string> = {
  estrategico: "Proceso estratégico",
  operativo: "Proceso operativo",
  apoyo: "Proceso de apoyo",
};

type Props = {
  params: { codigo: string };
};

/**
 * Detalle de un proceso del SGI.
 *
 * Server Component que carga el proceso por su código (no por UUID) para que
 * la URL sea más amigable: /procesos/EST-DIR en lugar de un UUID opaco.
 *
 * En futuras semanas, esta pantalla va a mostrar también:
 *   - Documentos asociados al proceso
 *   - Indicadores y KPIs
 *   - Participantes del proceso (responsable, elaboradores, aprobadores)
 *   - Auditorías recientes y hallazgos abiertos
 */
export default async function ProcesoDetallePage({ params }: Props) {
  const codigo = decodeURIComponent(params.codigo).toUpperCase();
  const supabase = createClient();

  const { data: proceso, error } = await supabase
    .from("procesos")
    .select("id, codigo, nombre, descripcion, descripcion_corta, tipo, color_hex, icono, objetivo, entradas, salidas")
    .eq("codigo", codigo)
    .eq("activo", true)
    .maybeSingle();

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

  const Icon = getProcessIcon(proceso.icono);
  const color = proceso.color_hex ?? "#475569";
  const tipoLabel = TIPO_LABEL[proceso.tipo] ?? proceso.tipo;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/procesos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al mapa de procesos
        </Link>
      </nav>

      {/* Encabezado: icono + identidad del proceso */}
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

      {/* Descripción larga si está presente */}
      {proceso.descripcion && (
        <section className="mb-10">
          <p className="text-base leading-relaxed text-foreground/90">
            {proceso.descripcion}
          </p>
        </section>
      )}

      {/* Objetivo del proceso */}
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

      {/* Entradas y salidas en dos columnas */}
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

      {/* Placeholder de documentos asociados (próxima semana lo poblamos) */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Documentos asociados</CardTitle>
          </div>
          <CardDescription className="leading-relaxed">
            La documentación del SGI vinculada a este proceso aparecerá acá una vez que
            esté disponible la pantalla de documentos. Por ahora, podés volver al{" "}
            <Link href="/procesos" className="underline text-primary hover:no-underline">
              mapa de procesos
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Próximamente · Semana 3 de Fase 1B
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Caja visual de entrada/salida del proceso.
 * Las entradas alinean a la izquierda; las salidas a la derecha,
 * sugiriendo flujo de izquierda a derecha sin necesidad de flechas reales.
 */
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
