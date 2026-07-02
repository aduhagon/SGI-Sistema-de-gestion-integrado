"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Link2 } from "lucide-react";
import type { NormaOpcion } from "@/lib/api/matriz";
import type { RequisitoOpcion } from "@/lib/api/coberturas";
import { agregarCobertura, type EstadoCobertura } from "@/app/(app)/documentos/[id]/cobertura-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Props = {
  documentoId: string;
  normas: NormaOpcion[];
  requisitosPorNorma: Record<string, RequisitoOpcion[]>;
  abierto: boolean;
  onClose: () => void;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="flex-1">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Vinculando…
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Vincular requisito
        </>
      )}
    </Button>
  );
}

export function AgregarCoberturaDialog({
  documentoId,
  normas,
  requisitosPorNorma,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoCobertura, FormData>(
    agregarCobertura,
    null,
  );
  const [normaSel, setNormaSel] = useState(normas[0]?.versionNormaId ?? "");
  const [requisitoSel, setRequisitoSel] = useState("");

  useEffect(() => {
    if (estado?.ok) {
      onClose();
      setRequisitoSel("");
      router.refresh();
    }
  }, [estado, onClose, router]);

  const requisitos = requisitosPorNorma[normaSel] ?? [];

  return (
    <ModalShell abierto={abierto} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader>
        <h2 id="cob-title" className="font-serif text-2xl font-semibold tracking-tight">
          Vincular requisito
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicá qué requisito de norma cubre este documento y con qué alcance.
        </p>
      </ModalHeader>

      <form action={formAction} className={MODAL_FORM_CLASS}>
        <ModalBody className="space-y-5">
          <input type="hidden" name="documentoId" value={documentoId} />

            <div className="space-y-2">
              <label htmlFor="norma" className="text-sm font-medium">Norma</label>
              <select
                id="norma"
                value={normaSel}
                onChange={(e) => {
                  setNormaSel(e.target.value);
                  setRequisitoSel("");
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {normas.map((n) => (
                  <option key={n.versionNormaId} value={n.versionNormaId}>
                    {n.nombreCorto} · {n.version}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="requisito" className="text-sm font-medium">Requisito</label>
              <select
                id="requisito"
                name="requisitoId"
                value={requisitoSel}
                onChange={(e) => setRequisitoSel(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>Elegí un requisito…</option>
                {requisitos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.clausula} — {r.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de cobertura</label>
              <div className="grid grid-cols-3 gap-2">
                {(["total", "parcial", "referencia"] as const).map((t, i) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-2 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="tipoCobertura"
                      value={t}
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: el documento satisface completamente el requisito. Parcial: lo cubre
                en parte. Referencia: lo menciona o remite a él.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="seccion" className="text-sm font-medium">
                Sección del documento <span className="text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="seccion"
                name="seccionDocumento"
                placeholder="Ej: punto 5.2, anexo B…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="pb-1" />
        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton disabled={!requisitoSel} />
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
