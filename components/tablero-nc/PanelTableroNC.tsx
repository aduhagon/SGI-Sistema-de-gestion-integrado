import { EvolucionNC } from "@/components/tablero-nc/EvolucionNC";
import { CortesNC } from "@/components/tablero-nc/CortesNC";
import { FiltroFechas } from "@/components/tablero-nc/FiltroFechas";
import type { TableroNC } from "@/lib/api/tableroNC";

/**
 * Panel del tablero de NC, pensado para embeberse arriba de la lista en /ncs.
 * Recibe los datos ya cargados (server) y la etiqueta del período activo.
 * El filtro de fechas navega por URL; ver FiltroFechas.
 */
export function PanelTableroNC({
  datos,
  periodoLabel,
}: {
  datos: TableroNC;
  periodoLabel: string;
}) {
  return (
    <div className="mb-8 rounded-xl border border-border bg-muted/20 p-4 sm:p-6">
      {/* Filtro de período */}
      <div className="mb-6">
        <FiltroFechas />
      </div>

      {/* Consolidado */}
      <div className="mb-8">
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Período: <span className="font-medium text-foreground">{periodoLabel}</span>
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="mt-1 font-serif text-3xl font-semibold">{datos.totales.total}</div>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Abiertas</div>
            <div className="mt-1 font-serif text-3xl font-semibold text-rose-700">{datos.totales.abiertas}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Cerradas</div>
            <div className="mt-1 font-serif text-3xl font-semibold text-emerald-700">{datos.totales.cerradas}</div>
          </div>
        </div>
      </div>

      {/* Evolución */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Evolución mensual
        </h2>
        <EvolucionNC datos={datos.evolucion} />
      </section>

      {/* Cortes */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Distribución
        </h2>
        <CortesNC porProceso={datos.porProceso} porNorma={datos.porNorma} porSeveridad={datos.porSeveridad} />
      </section>
    </div>
  );
}
