"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

const ESTADOS_NC = [
  { value: "abierta", label: "Abierta" },
  { value: "en_analisis", label: "En análisis" },
  { value: "en_tratamiento", label: "En tratamiento" },
  { value: "cerrada", label: "Cerrada" },
  { value: "aceptado_riesgo", label: "Riesgo aceptado" },
];

const ESTADOS_OBS = [
  { value: "abierto", label: "Abierta" },
  { value: "en_tratamiento", label: "En tratamiento" },
  { value: "cerrado", label: "Cerrada" },
  { value: "aceptado_riesgo", label: "Riesgo aceptado" },
];

export function NCFilters({ vista, total }: { vista: "ncs" | "observaciones"; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [texto, setTexto] = useState(searchParams.get("q") ?? "");

  useEffect(() => setTexto(searchParams.get("q") ?? ""), [searchParams]);

  function aplicar(cambios: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const actual = searchParams.get("q") ?? "";
    if (texto === actual) return;
    const timeout = setTimeout(() => aplicar({ q: texto }), 350);
    return () => clearTimeout(timeout);
    // aplicar depende de searchParams y se recrea intencionalmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const estado = searchParams.get("estado") ?? "";
  const hayFiltros = texto.trim() !== "" || estado !== "";
  const estados = vista === "ncs" ? ESTADOS_NC : ESTADOS_OBS;

  function limpiar() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("estado");
    setTexto("");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder={vista === "ncs" ? "Buscar por código, título o proceso…" : "Buscar observación o responsable…"}
            aria-label="Buscar"
            className="min-h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isPending ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Actualizando resultados" /> : null}
        </div>
        <select
          value={estado}
          onChange={(event) => aplicar({ estado: event.target.value })}
          aria-label="Filtrar por estado"
          className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52"
        >
          <option value="">Todos los estados</option>
          {estados.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {hayFiltros ? (
          <button type="button" onClick={limpiar} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" aria-hidden="true" /> Limpiar
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        <strong className="font-medium text-foreground">{total}</strong> {total === 1 ? "resultado" : "resultados"}{hayFiltros ? " con los filtros activos" : ""}.
      </p>
    </div>
  );
}
