"use client";

import { useState } from "react";
import { Table2, Network } from "lucide-react";
import type { Indicador, ProcesoOpcion, PuestoOpcion, NodoProcesoIndicador } from "@/lib/api/indicadores";
import { GestionIndicadores } from "@/components/indicadores/GestionIndicadores";
import ArbolIndicadores from "@/components/indicadores/ArbolIndicadores";

type Vista = "tabla" | "proceso";

export function IndicadoresVista({
  indicadores,
  procesos,
  puestos,
  arbol,
}: {
  indicadores: Indicador[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
  arbol: NodoProcesoIndicador[];
}) {
  const [vista, setVista] = useState<Vista>("proceso");

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setVista("proceso")}
          className={
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " +
            (vista === "proceso" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")
          }
          aria-pressed={vista === "proceso"}
        >
          <Network className="h-4 w-4" />
          Por proceso
        </button>
        <button
          type="button"
          onClick={() => setVista("tabla")}
          className={
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " +
            (vista === "tabla" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")
          }
          aria-pressed={vista === "tabla"}
        >
          <Table2 className="h-4 w-4" />
          Listado
        </button>
      </div>

      {vista === "proceso" ? (
        <ArbolIndicadores raices={arbol} />
      ) : (
        <GestionIndicadores indicadores={indicadores} procesos={procesos} puestos={puestos} />
      )}
    </div>
  );
}
