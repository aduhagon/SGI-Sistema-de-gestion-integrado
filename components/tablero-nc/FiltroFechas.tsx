"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check } from "lucide-react";
import { PRESETS, type PresetRango } from "@/lib/api/rangoFechasNC";

/**
 * Selector de rango de fechas del tablero de NC (embebido en /ncs). Presets
 * rápidos + rango personalizado. El estado vive en la URL
 * (?tablero=1&rango=&desde=&hasta=) para que la página (server) lo lea y filtre,
 * y para que el tablero permanezca abierto al cambiar el período.
 */
export function FiltroFechas() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const presetActual = (searchParams.get("rango") as PresetRango) ?? "todo";
  const desdeActual = searchParams.get("desde") ?? "";
  const hastaActual = searchParams.get("hasta") ?? "";

  const [desde, setDesde] = useState(desdeActual);
  const [hasta, setHasta] = useState(hastaActual);

  function aplicarPreset(preset: PresetRango) {
    const params = new URLSearchParams();
    params.set("tablero", "1"); // mantener el tablero abierto
    params.set("rango", preset);
    router.push(`/ncs?${params.toString()}`, { scroll: false });
  }

  function aplicarCustom() {
    const params = new URLSearchParams();
    params.set("tablero", "1");
    params.set("rango", "custom");
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    router.push(`/ncs?${params.toString()}`, { scroll: false });
  }

  const customActivo = presetActual === "custom";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        Período de análisis · por fecha de apertura
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p: { id: PresetRango; label: string }) => {
          const activo = presetActual === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => aplicarPreset(p.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
                (activo
                  ? "border-primary/30 bg-primary/[0.08] text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {activo && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Rango personalizado */}
      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <div className="space-y-1">
          <label htmlFor="rango-desde" className="block text-[11px] font-medium text-muted-foreground">
            Desde
          </label>
          <input
            id="rango-desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="rango-hasta" className="block text-[11px] font-medium text-muted-foreground">
            Hasta
          </label>
          <input
            id="rango-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={aplicarCustom}
          disabled={!desde && !hasta}
          className={
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
            (customActivo
              ? "bg-primary/[0.08] text-primary"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary")
          }
        >
          Aplicar rango
        </button>
      </div>
    </div>
  );
}
