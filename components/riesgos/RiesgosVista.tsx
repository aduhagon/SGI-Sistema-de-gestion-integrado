"use client";

import { useState } from "react";
import { Table2, Network, Grid3x3 } from "lucide-react";
import type {
  Riesgo, ProcesoOpcion, PuestoOpcion, NodoProcesoRiesgo,
  MitiganteRiesgo, DocumentoOpcion, IndicadorOpcion,
} from "@/lib/api/riesgos";
import { GestionRiesgos } from "@/components/riesgos/GestionRiesgos";
import ArbolRiesgos from "@/components/riesgos/ArbolRiesgos";
import MapaCalorRiesgos from "@/components/riesgos/MapaCalorRiesgos";

type Vista = "tabla" | "proceso" | "calor";

export function RiesgosVista({
  riesgos,
  procesos,
  puestos,
  arbol,
  mitigantesPorRiesgo,
  documentosOpc,
  indicadoresOpc,
}: {
  riesgos: Riesgo[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
  arbol: NodoProcesoRiesgo[];
  mitigantesPorRiesgo: Record<string, MitiganteRiesgo[]>;
  documentosOpc: DocumentoOpcion[];
  indicadoresOpc: IndicadorOpcion[];
}) {
  // El lápiz del mapa/árbol navega a /riesgos?riesgo=<id> con recarga real (<a>),
  // así el wrapper se remonta en "tabla" y GestionRiesgos abre el modal de edición.
  const [vista, setVista] = useState<Vista>("tabla");

  const btn = (v: Vista, activo: boolean) =>
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " +
    (activo ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground");

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
        <button type="button" onClick={() => setVista("tabla")} className={btn("tabla", vista === "tabla")} aria-pressed={vista === "tabla"}>
          <Table2 className="h-4 w-4" />
          Listado
        </button>
        <button type="button" onClick={() => setVista("proceso")} className={btn("proceso", vista === "proceso")} aria-pressed={vista === "proceso"}>
          <Network className="h-4 w-4" />
          Por proceso
        </button>
        <button type="button" onClick={() => setVista("calor")} className={btn("calor", vista === "calor")} aria-pressed={vista === "calor"}>
          <Grid3x3 className="h-4 w-4" />
          Mapa de calor
        </button>
      </div>

      {vista === "tabla" && <GestionRiesgos riesgos={riesgos} procesos={procesos} puestos={puestos} mitigantesPorRiesgo={mitigantesPorRiesgo} documentosOpc={documentosOpc} indicadoresOpc={indicadoresOpc} />}
      {vista === "proceso" && <ArbolRiesgos raices={arbol} mitigantesPorRiesgo={mitigantesPorRiesgo} />}
      {vista === "calor" && <MapaCalorRiesgos riesgos={riesgos} />}
    </div>
  );
}
