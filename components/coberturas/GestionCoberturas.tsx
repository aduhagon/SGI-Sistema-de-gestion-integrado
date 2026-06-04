"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Link2 } from "lucide-react";
import type { CoberturaActual } from "@/lib/api/coberturas";
import type { NormaOpcion } from "@/lib/api/matriz";
import type { RequisitoOpcion } from "@/lib/api/coberturas";
import { Button } from "@/components/ui/button";
import { AgregarCoberturaDialog } from "./AgregarCoberturaDialog";
import { eliminarCobertura } from "@/app/(app)/documentos/[id]/cobertura-actions";

type Props = {
  documentoId: string;
  coberturas: CoberturaActual[];
  normas: NormaOpcion[];
  // requisitos precargados por versión de norma, para el selector
  requisitosPorNorma: Record<string, RequisitoOpcion[]>;
};

const COLOR: Record<string, string> = {
  total: "#059669",
  parcial: "#d97706",
  referencia: "#0284c7",
};

const ETIQUETA: Record<string, string> = {
  total: "Total",
  parcial: "Parcial",
  referencia: "Referencia",
};

export function GestionCoberturas({
  documentoId,
  coberturas,
  normas,
  requisitosPorNorma,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function quitar(coberturaId: string) {
    setEliminando(coberturaId);
    const r = await eliminarCobertura(documentoId, coberturaId);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Requisitos que cubre
        </h2>
        {normas.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Vincular requisito
          </Button>
        )}
      </div>

      {coberturas.length > 0 ? (
        <div className="space-y-2">
          {coberturas.map((c) => (
            <div
              key={c.coberturaId}
              className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLOR[c.tipoCobertura] }}
                  title={`Cobertura ${ETIQUETA[c.tipoCobertura]}`}
                />
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {c.normaCodigo}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.clausula}
                    </span>
                    <span className="font-medium">{c.requisitoTitulo}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Cobertura {ETIQUETA[c.tipoCobertura].toLowerCase()}
                    {c.seccionDocumento ? ` · sección ${c.seccionDocumento}` : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => quitar(c.coberturaId)}
                disabled={eliminando === c.coberturaId}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Desvincular requisito"
                aria-label="Desvincular requisito"
              >
                {eliminando === c.coberturaId ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <Link2 className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Este documento no cubre ningún requisito todavía</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Vinculá los requisitos de norma que este documento satisface. Eso alimenta la
            matriz de cumplimiento.
          </p>
        </div>
      )}

      <AgregarCoberturaDialog
        documentoId={documentoId}
        normas={normas}
        requisitosPorNorma={requisitosPorNorma}
        abierto={abierto}
        onClose={() => setAbierto(false)}
      />
    </section>
  );
}
