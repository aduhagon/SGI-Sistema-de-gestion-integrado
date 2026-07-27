import { CalendarOff } from "lucide-react";
import {
  MODULO_COLOR_CALENDARIO,
  type HuecoCalendario,
} from "@/lib/api/calendario";

type Props = {
  huecos: HuecoCalendario[];
};

/**
 * Registros que deberían tener fecha y no la tienen.
 *
 * Va debajo de la grilla y no escondido en un filtro: si el hueco de datos no
 * está a la misma altura visual que el calendario, nadie lo mira. Mientras el
 * SGI tenga compromisos sin fecha, el calendario va a verse vacío y este panel
 * es el que explica por qué.
 */
export function PanelSinFecha({ huecos }: Props) {
  const total = huecos.reduce((n, h) => n + h.cantidad, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Todo con fecha asignada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay registros pendientes sin fecha. Todo lo que está abierto tiene
          un vencimiento cargado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-1 flex items-center gap-2">
        <CalendarOff
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm font-medium">
          Sin fecha asignada{" "}
          <span className="text-muted-foreground">({total})</span>
        </p>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Estos registros nunca van a aparecer en el calendario ni disparar una
        alerta de vencimiento.
      </p>

      <ul className="divide-y divide-border">
        {huecos.map((h) => (
          <li
            key={h.origen}
            className="flex items-center justify-between gap-4 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  MODULO_COLOR_CALENDARIO[h.origen] ?? "bg-slate-400"
                }`}
              />
              {h.etiqueta}
            </span>
            <span className="font-semibold tabular-nums text-amber-700">
              {h.cantidad}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
