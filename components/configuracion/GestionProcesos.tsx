"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Network } from "lucide-react";
import type { ProcesoCatalogo } from "@/lib/api/configuracion";
import { guardarProceso, eliminarProceso, type EstadoConfig } from "@/app/(app)/configuracion/procesos/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

const BANDAS: { valor: string; etiqueta: string }[] = [
  { valor: "estrategico", etiqueta: "Estratégicos" },
  { valor: "operativo", etiqueta: "Operativos" },
  { valor: "apoyo", etiqueta: "De apoyo" },
];

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear proceso"}</>}
    </Button>
  );
}

export function GestionProcesos({ procesos }: { procesos: ProcesoCatalogo[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<ProcesoCatalogo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarProceso, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarProceso(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  // Candidatos a proceso padre: todos menos el que se está editando.
  const candidatosPadre = procesos.filter((p) => !editando || p.id !== editando.id);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditando(null); setAbierto(true); }}><Plus className="h-4 w-4" />Nuevo proceso</Button>
      </div>

      {procesos.length > 0 ? (
        <div className="space-y-6">
          {BANDAS.map((banda) => {
            const delBanda = procesos.filter((p) => p.tipo === banda.valor);
            if (delBanda.length === 0) return null;
            return (
              <div key={banda.valor}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{banda.etiqueta}</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {delBanda.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 w-16 font-mono text-xs text-muted-foreground">{p.codigoNumerico ?? "—"}</td>
                          <td className="px-4 py-2.5 w-24 font-mono text-xs">{p.codigo}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{p.nombre}</div>
                            {p.procesoPadreNombre && <div className="text-xs text-muted-foreground">Subproceso de {p.procesoPadreNombre}</div>}
                            {p.descripcionCorta && !p.procesoPadreNombre && <div className="text-xs text-muted-foreground line-clamp-1">{p.descripcionCorta}</div>}
                          </td>
                          <td className="px-4 py-2.5 w-20">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditando(p); setAbierto(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => quitar(p.id)} disabled={eliminando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                                {eliminando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Network className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay procesos cargados</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">El mapa de procesos organiza el SGI en tres bandas: estratégicos, operativos y de apoyo.</p>
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-lg">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar proceso" : "Nuevo proceso"}</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="codigoNumerico" className="text-sm font-medium">Nº <span className="text-muted-foreground">(2 díg.)</span></label>
                    <input id="codigoNumerico" name="codigoNumerico" defaultValue={editando?.codigoNumerico ?? ""} placeholder="01" maxLength={2}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.replace(/[^0-9]/g, "").slice(0, 2); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="ordenVisualizacion" className="text-sm font-medium">Orden</label>
                    <input id="ordenVisualizacion" name="ordenVisualizacion" type="number" min={0} defaultValue={editando?.ordenVisualizacion ?? 0} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">El Nº de 2 dígitos se usa en la nomenclatura de documentos (ej: A-MP-<strong>05</strong>-001).</p>

                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                  <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="tipo" className="text-sm font-medium">Banda</label>
                    <select id="tipo" name="tipo" required defaultValue={editando?.tipo ?? "operativo"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {BANDAS.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="procesoPadreId" className="text-sm font-medium">Proceso padre <span className="text-muted-foreground">(opcional)</span></label>
                    <select id="procesoPadreId" name="procesoPadreId" defaultValue={editando?.procesoPadreId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Sin padre (proceso raíz)</option>
                      {candidatosPadre.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="descripcionCorta" className="text-sm font-medium">Descripción corta <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcionCorta" name="descripcionCorta" rows={2} defaultValue={editando?.descripcionCorta ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

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
