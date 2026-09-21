"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import type { NormaRelacionable, RelacionNorma } from "@/lib/api/normativa";
import {
  eliminarRelacionNorma,
  guardarRelacionNorma,
  type EstadoConfig,
} from "@/app/(app)/configuracion/normas/actions";
import { Button } from "@/components/ui/button";
import {
  ModalBody,
  ModalError,
  ModalFooter,
  ModalHeader,
  ModalShell,
  MODAL_FORM_CLASS,
} from "@/components/ui/modal";

const TIPOS = [
  { value: "depende_de", label: "Depende de (norma principal)" },
  { value: "reglamenta", label: "Reglamenta a" },
  { value: "complementa", label: "Complementa a" },
  { value: "modifica", label: "Modifica a" },
  { value: "sustituye", label: "Sustituye a" },
  { value: "deroga", label: "Deroga a" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
      ) : (
        <><Link2 className="h-4 w-4" />Vincular normas</>
      )}
    </Button>
  );
}

export function GestionRelacionesNorma({
  normaId,
  normasDisponibles,
  relaciones,
}: {
  normaId: string;
  normasDisponibles: NormaRelacionable[];
  relaciones: RelacionNorma[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(
    guardarRelacionNorma,
    null,
  );

  useEffect(() => {
    if (estado?.ok) {
      setAbierto(false);
      router.refresh();
    }
  }, [estado, router]);

  async function quitar(id: string) {
    setErrorLocal(null);
    setEliminando(id);
    const resultado = await eliminarRelacionNorma(id, normaId);
    setEliminando(null);
    if (resultado?.ok) router.refresh();
    else setErrorLocal(resultado?.error ?? "No se pudo quitar la relación.");
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Marco normativo relacionado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vinculá la norma principal con sus reglamentarias, complementarias y modificatorias.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />Agregar relación
        </Button>
      </div>

      {errorLocal && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorLocal}
        </p>
      )}

      {relaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
          <Link2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">Todavía no hay normas vinculadas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            El vínculo se carga una sola vez y se muestra automáticamente desde ambas normas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {relaciones.map((relacion) => (
            <article key={relacion.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {relacion.etiqueta}
                    </span>
                    {(relacion.vigenteDesde || relacion.vigenteHasta) && (
                      <span className="text-[11px] text-muted-foreground">
                        {relacion.vigenteDesde ? `Desde ${relacion.vigenteDesde}` : ""}
                        {relacion.vigenteDesde && relacion.vigenteHasta ? " · " : ""}
                        {relacion.vigenteHasta ? `Hasta ${relacion.vigenteHasta}` : ""}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/configuracion/normas/${relacion.normaRelacionada.id}`}
                    className="font-medium hover:underline"
                  >
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {relacion.normaRelacionada.codigo}
                    </span>
                    {relacion.normaRelacionada.nombreCorto}
                  </Link>
                  {relacion.articulosAfectados && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <strong>Artículos:</strong> {relacion.articulosAfectados}
                    </p>
                  )}
                  {relacion.observacion && (
                    <p className="mt-1 text-sm text-muted-foreground">{relacion.observacion}</p>
                  )}
                  {relacion.fuenteUrl && (
                    <a
                      href={relacion.fuenteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Fuente oficial <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => quitar(relacion.id)}
                  disabled={eliminando === relacion.id}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  title="Quitar relación"
                  aria-label="Quitar relación"
                >
                  {eliminando === relacion.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-xl">
          <ModalHeader>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Vincular otra norma
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La frase se lee desde la norma actual hacia la norma seleccionada.
            </p>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <input type="hidden" name="normaOrigenId" value={normaId} />
            <ModalBody className="space-y-4 pb-3">
              <div className="space-y-2">
                <label htmlFor="tipo" className="text-sm font-medium">Tipo de relación</label>
                <select id="tipo" name="tipo" required defaultValue="depende_de" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="normaDestinoId" className="text-sm font-medium">Norma relacionada</label>
                <select id="normaDestinoId" name="normaDestinoId" required defaultValue="" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="" disabled>Seleccionar…</option>
                  {normasDisponibles.map((norma) => (
                    <option key={norma.id} value={norma.id}>{norma.codigo} — {norma.nombreCorto}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="articulosAfectados" className="text-sm font-medium">Artículos afectados <span className="text-muted-foreground">(opcional)</span></label>
                <input id="articulosAfectados" name="articulosAfectados" placeholder="Ej.: arts. 5, 8 y 12" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="vigenteDesde" className="text-sm font-medium">Vigente desde</label>
                  <input id="vigenteDesde" name="vigenteDesde" type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="vigenteHasta" className="text-sm font-medium">Vigente hasta</label>
                  <input id="vigenteHasta" name="vigenteHasta" type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="fuenteUrl" className="text-sm font-medium">Fuente oficial <span className="text-muted-foreground">(opcional)</span></label>
                <input id="fuenteUrl" name="fuenteUrl" type="url" placeholder="https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label htmlFor="observacion" className="text-sm font-medium">Fundamento u observación <span className="text-muted-foreground">(opcional)</span></label>
                <textarea id="observacion" name="observacion" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                <SubmitButton />
              </div>
            </ModalFooter>
          </form>
        </ModalShell>
      )}
    </section>
  );
}
