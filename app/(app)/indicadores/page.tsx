import { listarIndicadores, obtenerDatosFormIndicador } from "@/lib/api/indicadores";
import { GestionIndicadores } from "@/components/indicadores/GestionIndicadores";

export const dynamic = "force-dynamic";

export default async function IndicadoresPage() {
  const [indicadores, { procesos, puestos }] = await Promise.all([
    listarIndicadores(),
    obtenerDatosFormIndicador(),
  ]);

  const incumplen = indicadores.filter((i) => i.cumplimiento === "incumple").length;
  const alertas = indicadores.filter((i) => i.cumplimiento === "alerta").length;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">SGI · Indicadores</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Indicadores de proceso</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Los KPIs de cada proceso, con su meta y periodicidad. Cargá las mediciones período a período
          y seguí el cumplimiento y la evolución de cada indicador.
        </p>
        {(incumplen > 0 || alertas > 0) && (
          <div className="mt-4 flex gap-3 text-sm">
            {incumplen > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">{incumplen} incumple{incumplen !== 1 ? "n" : ""}</span>}
            {alertas > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">{alertas} en alerta</span>}
          </div>
        )}
      </header>
      <GestionIndicadores indicadores={indicadores} procesos={procesos} puestos={puestos} />
    </div>
  );
}
