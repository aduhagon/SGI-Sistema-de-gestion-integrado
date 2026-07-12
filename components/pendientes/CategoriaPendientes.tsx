"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Pendiente, NivelPendiente } from "@/lib/api/pendientes";

/**
 * Estilo por nivel de escalamiento. El nivel lo calcula fn_pendientes_usuario
 * en la base usando la zona horaria del sistema.
 */
const NIVEL: Record<
  NivelPendiente,
  { label: (d: number | null) => string; dot: string; chip: string }
> = {
  vencido: {
    label: (d) =>
      d != null
        ? `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`
        : "Vencido",
    dot: "bg-red-600",
    chip: "bg-red-50 text-red-700 border-red-200",
  },
  vencido_hoy: {
    label: () => "Vence hoy",
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 border-red-200",
  },
  advertencia: {
    label: (d) => (d != null ? `En ${d} día${d === 1 ? "" : "s"}` : "Próximo"),
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  recordatorio: {
    label: (d) => (d != null ? `En ${d} días` : "Sin plazo"),
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

/** Cuenta cuántos ítems están vencidos o vencen hoy. */
function contarUrgentes(items: Pendiente[]): number {
  return items.filter(
    (i) => i.nivel === "vencido" || i.nivel === "vencido_hoy",
  ).length;
}

export function CategoriaPendientes({
  label,
  items,
  inicialAbierto = false,
}: {
  label: string;
  items: Pendiente[];
  inicialAbierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(inicialAbierto);
  const urgentes = contarUrgentes(items);

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      {/* Cabecera colapsable: título + contadores */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          abierto && "border-b border-border bg-muted/20",
        )}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
            abierto && "rotate-90",
          )}
          aria-hidden="true"
        />

        <span className="flex-1 truncate font-serif text-sm font-semibold">
          {label}
        </span>

        {/* Contador de urgentes: solo si hay */}
        {urgentes > 0 && (
          <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-700">
            {urgentes} vencido{urgentes === 1 ? "" : "s"}
          </span>
        )}

        {/* Contador total */}
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </button>

      {/* Cuerpo: se monta siempre, se colapsa con grid-rows para animar */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          {items.map((item, idx) => {
            const meta = NIVEL[item.nivel];
            return (
              <Link
                key={`${item.modulo}-${item.entidadId}`}
                href={item.urlDestino}
                tabIndex={abierto ? undefined : -1}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                  idx > 0 && "border-t border-border",
                )}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`}
                  aria-hidden="true"
                />
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {item.codigo}
                </span>
                <span className="flex-1 truncate text-sm">{item.titulo}</span>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
                >
                  {meta.label(item.diasRestantes)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
