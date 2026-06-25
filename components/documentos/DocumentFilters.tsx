"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";

type Opcion = { id: string; codigo: string; nombre: string };

type Props = {
  procesos: Opcion[];
  tipos: Opcion[];
  normas: Opcion[];
};

const ESTADOS = [
  { value: "borrador", label: "Borrador" },
  { value: "confeccionado", label: "Confeccionado" },
  { value: "pendiente_aprobacion", label: "Pendiente aprobación" },
  { value: "aprobado", label: "Aprobado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "obsoleto", label: "Obsoleto" },
];

export function DocumentFilters({ procesos, tipos, normas }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [texto, setTexto] = useState(searchParams.get("q") ?? "");

  // Sincroniza el input si cambian los params desde afuera (ej. limpiar).
  useEffect(() => {
    setTexto(searchParams.get("q") ?? "");
  }, [searchParams]);

  function aplicar(cambios: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === "") params.delete(clave);
      else params.set(clave, valor);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  // Debounce de la búsqueda por texto.
  useEffect(() => {
    const actual = searchParams.get("q") ?? "";
    if (texto === actual) return;
    const t = setTimeout(() => aplicar({ q: texto }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const estado = searchParams.get("estado") ?? "";
  const proceso = searchParams.get("proceso") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const norma = searchParams.get("norma") ?? "";
  const hayFiltros = texto !== "" || estado !== "" || proceso !== "" || tipo !== "" || norma !== "";

  function limpiar() {
    setTexto("");
    startTransition(() => router.replace(pathname));
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por código o título…"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <select
        value={estado}
        onChange={(e) => aplicar({ estado: e.target.value })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>

      <select
        value={proceso}
        onChange={(e) => aplicar({ proceso: e.target.value })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[220px]"
      >
        <option value="">Todos los procesos</option>
        {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
      </select>

      <select
        value={norma}
        onChange={(e) => aplicar({ norma: e.target.value })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[200px]"
      >
        <option value="">Todas las normas</option>
        {normas.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
      </select>

      <select
        value={tipo}
        onChange={(e) => aplicar({ tipo: e.target.value })}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[200px]"
      >
        <option value="">Todos los tipos</option>
        {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </select>

      {hayFiltros && (
        <button
          type="button"
          onClick={limpiar}
          className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar
        </button>
      )}
    </div>
  );
}
