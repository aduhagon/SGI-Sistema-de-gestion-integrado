"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, BookOpen, ExternalLink } from "lucide-react";
import type { NormaCatalogo } from "@/lib/api/configuracion";
import { guardarNorma, eliminarNorma, type EstadoConfig } from "@/app/(app)/configuracion/normas/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear norma"}</>}
    </Button>
  );
}

export function GestionNormas({ normas }: { normas: NormaCatalogo[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<NormaCatalogo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarNorma, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarNorma(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditando(null); setAbierto(true); }}><Plus className="h-4 w-4" />Nueva norma</Button>
      </div>

      {normas.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Norma</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Ámbito</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {normas.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{n.codigo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      {n.nombreCorto}
                      {n.sitioWeb && <a href={n.sitioWeb} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Sitio web"><ExternalLink className="h-3 w-3" /></a>}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{n.nombreCompleto}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{n.ambito ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditando(n); setAbierto(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(n.id)} disabled={eliminando === n.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <BookOpen className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay normas cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Las normas certificadas por MSU (ISO 9001, BRCGS, etc.). Cada una tendrá luego sus versiones y requisitos.</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar norma" : "Nueva norma"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="nombreCorto" className="text-sm font-medium">Nombre corto</label>
                    <input id="nombreCorto" name="nombreCorto" required defaultValue={editando?.nombreCorto ?? ""} placeholder="Ej: ISO 9001" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">El código son mayúsculas y números, sin guiones (ej: ISO9001, ISO14001, BRCGS).</p>

                <div className="space-y-2">
                  <label htmlFor="nombreCompleto" className="text-sm font-medium">Nombre completo</label>
                  <input id="nombreCompleto" name="nombreCompleto" required defaultValue={editando?.nombreCompleto ?? ""} placeholder="Ej: ISO 9001 - Sistemas de Gestión de la Calidad" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="organismoEmisor" className="text-sm font-medium">Organismo emisor <span className="text-muted-foreground">(opc.)</span></label>
                    <input id="organismoEmisor" name="organismoEmisor" defaultValue={editando?.organismoEmisor ?? ""} placeholder="Ej: ISO" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="ambito" className="text-sm font-medium">Ámbito <span className="text-muted-foreground">(opc.)</span></label>
                    <input id="ambito" name="ambito" defaultValue={editando?.ambito ?? ""} placeholder="Ej: Calidad" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sitioWeb" className="text-sm font-medium">Sitio web <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="sitioWeb" name="sitioWeb" type="url" defaultValue={editando?.sitioWeb ?? ""} placeholder="https://..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" name="certificadaPorMsu" defaultChecked={editando ? editando.certificadaPorMsu : true} className="h-4 w-4" />
                    Certificada por MSU
                  </label>
                  <div className="space-y-2">
                    <label htmlFor="ordenVisualizacion" className="text-sm font-medium">Orden</label>
                    <input id="ordenVisualizacion" name="ordenVisualizacion" type="number" min={0} defaultValue={editando?.ordenVisualizacion ?? 0} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                {estado && !estado.ok && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton edicion={!!editando} />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
