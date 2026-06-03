"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { UsuarioElegible } from "@/lib/api/envio";
import { Button } from "@/components/ui/button";
import { EnviarAprobacionDialog } from "./EnviarAprobacionDialog";

type Props = {
  documentoId: string;
  versionId: string;
  numeroVersion: string;
  usuarios: UsuarioElegible[];
};

export function BotonEnviarAprobacion({
  documentoId,
  versionId,
  numeroVersion,
  usuarios,
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
        abierto={abierto}
        onClose={() => setAbierto(false)}
      />
    </>
  );
}
