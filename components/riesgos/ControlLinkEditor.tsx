"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search, ShieldCheck } from "lucide-react";
import type { ControlRiesgoResumen } from "@/lib/api/controles";

export function ControlLinkEditor({
  inicial,
  opciones,
  procesoId,
}: {
  inicial: ControlRiesgoResumen[];
  opciones: ControlRiesgoResumen[];
  procesoId: string;
}) {
  const [seleccion, setSeleccion] = useState(inicial.map((control) => control.id));
  const [busqueda, setBusqueda] = useState("");

  const controlesProceso = useMemo(
    () => opciones.filter((control) => control.procesoId === procesoId && control.estado !== "suspendido"),
    [opciones, procesoId],
  );
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    if (!consulta) return controlesProceso;
    return controlesProceso.filter((control) =>
      `${control.codigo} ${control.nombre}`.toLowerCase().includes(consulta),
    );
  }, [busqueda, controlesProceso]);

  useEffect(() => {
    setSeleccion((actuales) => actuales.filter((id) => controlesProceso.some((control) => control.id === id)));
  }, [controlesProceso]);

  function alternar(id: string) {
    setSeleccion((actuales) => actuales.includes(id) ? actuales.filter((valor) => valor !== id) : [...actuales, id]);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="controles" value={JSON.stringify(seleccion)} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{seleccion.length} control{seleccion.length === 1 ? "" : "es"} vinculado{seleccion.length === 1 ? "" : "s"}</p>
        <Link href={procesoId ? `/controles?proceso=${procesoId}` : "/controles"} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Administrar controles <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      {controlesProceso.length > 6 && (
        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="sr-only">Buscar controles</span>
          <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar control..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      )}
      {visibles.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          {procesoId ? "No hay controles activos para este proceso." : "Primero elegí un proceso."}
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-md border border-border">
          {visibles.map((control) => (
            <label key={control.id} className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/40">
              <input type="checkbox" checked={seleccion.includes(control.id)} onChange={() => alternar(control.id)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
              <span className="min-w-0 text-sm">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{control.codigo}</span>
                <span>{control.nombre}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
