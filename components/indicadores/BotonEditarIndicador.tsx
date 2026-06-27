"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Indicador, ProcesoOpcion, PuestoOpcion } from "@/lib/api/indicadores";
import { IndicadorFormModal } from "@/components/indicadores/IndicadorFormModal";
import { Button } from "@/components/ui/button";

/** Botón "Editar" del detalle del indicador. Abre el mismo modal reusable. */
export function BotonEditarIndicador({
  indicador,
  procesos,
  puestos,
}: {
  indicador: Indicador;
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Pencil className="h-4 w-4" />Editar indicador
      </Button>
      <IndicadorFormModal
        editando={indicador}
        procesos={procesos}
        puestos={puestos}
        abierto={abierto}
        onClose={() => setAbierto(false)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
