"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

const ESTADOS = [
  ["planificada", "Planificada"],
  ["en_curso", "En curso"],
  ["informe_emitido", "Informe emitido"],
  ["cerrada", "Cerrada"],
  ["cancelada", "Cancelada"],
] as const;

export function AuditoriaFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [texto, setTexto] = useState(searchParams.get("q") ?? "");

  useEffect(() => setTexto(searchParams.get("q") ?? ""), [searchParams]);

  function aplicar(cambios: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(cambios).forEach(([clave, valor]) => valor ? params.set(clave, valor) : params.delete(clave));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const actual = searchParams.get("q") ?? "";
    if (actual === texto) return;
    const timeout = setTimeout(() => aplicar({ q: texto }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const estado = searchParams.get("estado") ?? "";
  const hayFiltros = texto.trim() !== "" || estado !== "";

  function limpiar() {
    setTexto("");
    startTransition(() => router.replace(pathname));
  }

  return (
    <div className="mb-5 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input type="search" value={texto} onChange={(event) => setTexto(event.target.value)} placeholder="Buscar por código, título o entidad…" aria-label="Buscar auditorías" className="min-h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {pending ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Actualizando resultados" /> : null}
        </div>
        <select value={estado} onChange={(event) => aplicar({ estado: event.target.value })} aria-label="Filtrar auditorías por estado" className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52">
          <option value="">Todos los estados</option>
          {ESTADOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {hayFiltros ? <button type="button" onClick={limpiar} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden="true" />Limpiar</button> : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite"><strong className="font-medium text-foreground">{total}</strong> {total === 1 ? "resultado" : "resultados"}{hayFiltros ? " con los filtros activos" : ""}.</p>
    </div>
  );
}
