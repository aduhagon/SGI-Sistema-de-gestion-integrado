"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { UsuarioElegible, SugerenciaAprobacion } from "@/lib/api/envio";
import { Button } from "@/components/ui/button";
import { EnviarAprobacionDialog } from "./EnviarAprobacionDialog";

type Props = {
  documentoId: string;
  versionId: string;
  numeroVersion: string;
  usuarios: UsuarioElegible[];
  sugerencia: SugerenciaAprobacion;
};

export function BotonEnviarAprobacion({
  documentoId,
  versionId,
  numeroVersion,
  usuarios,
  sugerencia,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Enviar a aprobación
      </Button>

      <EnviarAprobacionDialog
        documentoId={documentoId}
        versionId={versionId}
        numeroVersion={numeroVersion}
        usuarios={usuarios}
        sugerencia={sugerencia}
        abierto={abierto}
        onClose={() => setAbierto(false)}
      />
    </>
  );
}
