"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Layers, ChevronRight, Star, ExternalLink } from "lucide-react";
import type { VersionNorma } from "@/lib/api/normativa";
import { guardarVersionNorma, eliminarVersionNorma, type EstadoNormativa } from "@/app/(app)/configuracion/normas/[id]/version-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear versión"}</>}
    </Button>
  );
}

export function GestionVersionesNorma({ normaId, versiones }: { normaId: string; versiones: VersionNorma[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<VersionNorma | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoNormativa, FormData>(guardarVersionNorma, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrir(v: VersionNorma | null) {
    setEditando(v);
    setActual(v ? v.esVersionActual : false);
    setAbierto(true);
  }

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarVersionNorma(id, normaId);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const fmt = (f: string | null) => f ? new Date(f + "T00:00:00").toLocaleDateString("es-AR", { year: "numeric", month: "short" }) : null;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nueva versión</Button>
      </div>

      {versiones.length > 0 ? (
        <div className="space-y-2">
          {versiones.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Versión {v.version}</span>
                  {v.esVersionActual && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700"><Star className="h-2.5 w-2.5" />Actual</span>}
                  {v.urlDescarga && <a href={v.urlDescarga} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Descargar"><ExternalLink className="h-3 w-3" /></a>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.nombreVersion ? `${v.nombreVersion} · ` : ""}
                  {v.cantidadRequisitos} requisito{v.cantidadRequisitos !== 1 ? "s" : ""}
                  {fmt(v.fechaPublicacion) ? ` · publicada ${fmt(v.fechaPublicacion)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/configuracion/normas/version/${v.id}`} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  Requisitos<ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <button onClick={() => abrir(v)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => quitar(v.id)} disabled={eliminando === v.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                  {eliminando === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Layers className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay versiones cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Cada norma tiene una o más versiones (ej: ISO 9001:2015). Los requisitos pertenecen a una versión concreta.</p>
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-md">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar versión" : "Nueva versión"}</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
                <input type="hidden" name="normaId" value={normaId} />
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="version" className="text-sm font-medium">Versión</label>
                    <input id="version" name="version" required defaultValue={editando?.version ?? ""} placeholder="Ej: 2015, Issue 9" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fechaPublicacion" className="text-sm font-medium">Publicación</label>
                    <input id="fechaPublicacion" name="fechaPublicacion" type="date" defaultValue={editando?.fechaPublicacion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="nombreVersion" className="text-sm font-medium">Nombre de la versión <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="nombreVersion" name="nombreVersion" defaultValue={editando?.nombreVersion ?? ""} placeholder="Ej: Cuarta edición" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="urlDescarga" className="text-sm font-medium">Enlace al documento <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="urlDescarga" name="urlDescarga" type="url" defaultValue={editando?.urlDescarga ?? ""} placeholder="https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" name="esVersionActual" checked={actual} onChange={(e) => setActual(e.target.checked)} className="h-4 w-4" />
                  Es la versión vigente (la actual de esta norma)
                </label>
                {actual && <p className="-mt-2 text-xs text-muted-foreground">Al marcarla como actual, las demás versiones de esta norma dejan de serlo.</p>}
            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
              <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton edicion={!!editando} />
              </div>
            </ModalFooter>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
