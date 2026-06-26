"use client";

import { useState } from "react";
import { Table2, Network } from "lucide-react";
import type { Riesgo, ProcesoOpcion, PuestoOpcion, NodoProcesoRiesgo } from "@/lib/api/riesgos";
import { GestionRiesgos } from "@/components/riesgos/GestionRiesgos";
import ArbolRiesgos from "@/components/riesgos/ArbolRiesgos";

type Vista = "tabla" | "proceso";

export function RiesgosVista({
  riesgos,
  procesos,
  puestos,
  arbol,
}: {
  riesgos: Riesgo[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
  arbol: NodoProcesoRiesgo[];
}) {
  const [vista, setVista] = useState<Vista>("tabla");

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
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
      </div>

      {vista === "tabla" ? (
        <GestionRiesgos riesgos={riesgos} procesos={procesos} puestos={puestos} />
      ) : (
        <ArbolRiesgos raices={arbol} />
      )}
    </div>
  );
}
