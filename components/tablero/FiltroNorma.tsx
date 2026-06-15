"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import type { NormaOpcion } from "@/lib/api/mapaCalor";

/**
 * Selector de norma para tamizar el tablero. Cambia el query param ?norma=ID,
 * que la página lee para filtrar. "Todas las normas" = sin filtro.
 */
export function FiltroNorma({ normas }: { normas: NormaOpcion[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const actual = params.get("norma") ?? "";

  function cambiar(valor: string) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set("norma", valor);
    else p.delete("norma");
    router.push(`/tablero${p.toString() ? "?" + p.toString() : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="filtro-norma" className="text-sm text-muted-foreground">
        Norma:
      </label>
      <select
        id="filtro-norma"
        value={actual}
        onChange={(e) => cambiar(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Todas las normas</option>
        {normas.map((n) => (
          <option key={n.id} value={n.id}>{n.nombreCorto}</option>
        ))}
      </select>
    </div>
  );
}
