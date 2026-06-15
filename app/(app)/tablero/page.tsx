import { obtenerMapaCalorProcesos } from "@/lib/api/mapaCalor";
import { MapaCalor } from "@/components/tablero/MapaCalor";
import { LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TableroControlPage() {
  const procesos = await obtenerMapaCalorProcesos();

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sistema de Gestión Integrado
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Tablero de control
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Estado de control de cada proceso de un vistazo. El color resume cuatro
          señales —no conformidades, documentos, indicadores y riesgos— y muestra
          el peor estado entre ellas. Los procesos en gris todavía no tienen datos
          cargados.
        </p>
      </header>

      {procesos.length > 0 ? (
        <MapaCalor procesos={procesos} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <LayoutGrid className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No hay procesos para mostrar</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Cargá procesos activos para ver su estado de control acá.
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
    </div>
  );
}
