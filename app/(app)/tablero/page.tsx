import { obtenerMapaCalorProcesos, obtenerNormasParaTablero } from "@/lib/api/mapaCalor";
import { MapaCalor } from "@/components/tablero/MapaCalor";
import { FiltroNorma } from "@/components/tablero/FiltroNorma";
import { LayoutGrid } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function TableroControlPage({
  searchParams,
}: {
  searchParams: { norma?: string };
}) {
  const normaId = searchParams?.norma || null;
  const [procesos, normas] = await Promise.all([
    obtenerMapaCalorProcesos(normaId),
    obtenerNormasParaTablero(),
  ]);
  const normaActiva = normas.find((n) => n.id === normaId) ?? null;

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Análisis transversal" title="Estado del SGI" description="Muestra la señal más crítica de cada proceso entre no conformidades, documentos, indicadores y riesgos.">
        <FiltroNorma normas={normas} />
      </PageHeader>

      {procesos.length > 0 ? (
        <MapaCalor procesos={procesos} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <LayoutGrid className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">
            {normaActiva
              ? `Ningún proceso tiene elementos vinculados a ${normaActiva.nombreCorto}`
              : "No hay procesos para mostrar"}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {normaActiva
              ? "Cuando cargues documentos o NC asociados a esta norma, los procesos aparecerán acá."
              : "Cargá procesos activos para ver su estado de control acá."}
          </p>
        </div>
      )}

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <p className="mb-2 font-medium">Cómo se calcula el color</p>
        <ul className="space-y-1">
          <li>• <span className="text-rose-600 font-medium">Crítico:</span> NC vencida, revisión de documento vencida, indicador que incumple meta, o riesgo alto sin tratar.</li>
          <li>• <span className="text-amber-600 font-medium">Atención:</span> NC abierta dentro de plazo, o indicador sin medición reciente.</li>
          <li>• <span className="text-emerald-600 font-medium">En control:</span> tiene elementos cargados y todos están sanos.</li>
          <li>• <span className="text-muted-foreground font-medium">Sin datos:</span> el proceso todavía no tiene NC, documentos, indicadores ni riesgos cargados.</li>
        </ul>
      </footer>
    </PageContainer>
  );
}
