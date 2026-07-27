import Link from "next/link";
import {
  MODULO_COLOR_CALENDARIO,
  MODULO_LABEL_CALENDARIO,
  type EventoCalendario,
} from "@/lib/api/calendario";

type Props = {
  anio: number;
  mes: number; // 1-12
  hoy: string | null; // YYYY-MM-DD en la zona del sistema, o null si es otro mes
  eventos: EventoCalendario[];
};

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Arma "YYYY-MM-DD" sin pasar por Date, para no arrastrar corrimientos de zona. */
function claveFecha(anio: number, mes: number, dia: number): string {
  const m = String(mes).padStart(2, "0");
  const d = String(dia).padStart(2, "0");
  return `${anio}-${m}-${d}`;
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Día de la semana del 1° del mes, con la semana arrancando en lunes (0 = lunes). */
function offsetPrimerDia(anio: number, mes: number): number {
  const dow = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay(); // 0 = domingo
  return (dow + 6) % 7;
}

export function GrillaMes({ anio, mes, hoy, eventos }: Props) {
  const total = diasDelMes(anio, mes);
  const offset = offsetPrimerDia(anio, mes);

  // Indexar los eventos por fecha una sola vez.
  const porFecha = new Map<string, EventoCalendario[]>();
  for (const ev of eventos) {
    const lista = porFecha.get(ev.fechaEvento);
    if (lista) lista.push(ev);
    else porFecha.set(ev.fechaEvento, [ev]);
  }

  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`vacio-${idx}`} className="min-h-[84px]" />;
          }

          const clave = claveFecha(anio, mes, dia);
          const delDia = porFecha.get(clave) ?? [];
          const esHoy = hoy === clave;

          return (
            <div
              key={clave}
              className={
                esHoy
                  ? "min-h-[84px] rounded-md border border-primary/40 bg-primary/[0.04] p-1.5"
                  : "min-h-[84px] rounded-md border border-border p-1.5"
              }
            >
              <div
                className={
                  esHoy
                    ? "mb-1 text-[11px] font-semibold text-primary"
                    : "mb-1 text-[11px] text-muted-foreground"
                }
              >
                {dia}
              </div>

              <div className="space-y-1">
                {delDia.slice(0, 3).map((ev) => {
                  const vencido =
                    ev.nivel === "vencido" || ev.nivel === "vencido_hoy";
                  return (
                    <Link
                      key={`${ev.origenTabla}-${ev.entidadId}`}
                      href={ev.urlDestino}
                      title={`${MODULO_LABEL_CALENDARIO[ev.modulo] ?? ev.modulo} · ${ev.codigo} — ${ev.titulo}`}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight transition-colors hover:bg-primary/[0.06]"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          MODULO_COLOR_CALENDARIO[ev.modulo] ?? "bg-slate-400"
                        }`}
                      />
                      <span
                        className={
                          vencido
                            ? "truncate text-red-700"
                            : "truncate text-foreground/80"
                        }
                      >
                        {ev.codigo}
                      </span>
                    </Link>
                  );
                })}

                {delDia.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">
                    +{delDia.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
