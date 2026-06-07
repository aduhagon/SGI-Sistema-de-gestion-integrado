import { Briefcase, Circle } from "lucide-react";
import type { PuestoHistorial } from "@/lib/api/personas";

export function HistorialPuestos({ historial }: { historial: PuestoHistorial[] }) {
  if (historial.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
        <Briefcase className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Sin puestos registrados</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Cuando se asigne esta persona a un puesto, su historial aparecerá acá: el vigente y los anteriores.
        </p>
      </div>
    );
  }

  const fmt = (f: string) => new Date(f).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-2">
      {historial.map((h) => {
        const vigente = h.vigenteHasta === null;
        return (
          <div key={h.id} className={`rounded-md border bg-card p-4 ${vigente ? "border-border" : "border-border/60 opacity-75"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Circle className={`h-2.5 w-2.5 shrink-0 ${vigente ? "fill-emerald-500 text-emerald-500" : "fill-muted-foreground/40 text-muted-foreground/40"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{h.puestoCodigo}</span>
                    <span className="text-sm font-medium">{h.puestoNombre}</span>
                    {vigente && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">Vigente</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Desde {fmt(h.vigenteDesde)}{h.vigenteHasta ? ` hasta ${fmt(h.vigenteHasta)}` : " · sin fecha de baja"}
                  </p>
                  {h.motivoRevocacion && (
                    <p className="mt-1 text-xs text-muted-foreground italic">Baja: {h.motivoRevocacion}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
