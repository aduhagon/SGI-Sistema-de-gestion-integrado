"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NCModalWizard } from "@/components/ncs/NCModalWizard";
import type { NormaOpcionNC, RequisitoOpcionNC } from "@/components/ncs/SelectorRequisitoNC";

type ProcOpcion = { id: string; codigo: string; nombre: string };
type HallazgoOpcion = { id: string; codigo: string; titulo: string; tipo: string };

export function BotonNuevaNC({
  procesos,
  hallazgos,
  normas,
  requisitosPorNorma,
}: {
  procesos: ProcOpcion[];
  hallazgos: HallazgoOpcion[];
  normas: NormaOpcionNC[];
  requisitosPorNorma: Record<string, RequisitoOpcionNC[]>;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />Abrir no conformidad
      </Button>
      <NCModalWizard
        procesos={procesos}
        hallazgos={hallazgos}
        normas={normas}
        requisitosPorNorma={requisitosPorNorma}
        abierto={abierto}
        onClose={() => setAbierto(false)}
      />
    </>
  );
}
