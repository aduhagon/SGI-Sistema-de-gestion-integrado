"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, FileType, Check } from "lucide-react";
import type { TipoDocumental } from "@/lib/api/configuracion";
import { guardarTipoDocumental, eliminarTipoDocumental, type EstadoConfig } from "@/app/(app)/configuracion/tipos/actions";
import { Button } from "@/components/ui/button";

const FRECUENCIAS = ["trimestral", "semestral", "anual", "bienal", "trienal", "quinquenal", "ad_hoc", "sin_revision"];
const CRITICIDADES = ["critico", "alto", "medio", "bajo"];
const CONFIDENCIALIDADES = ["publico", "interno", "confidencial", "restringido"];
const NIVELES = ["gerente", "jefatura", "analista", "operativo"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear tipo"}</>}
    </Button>
  );
}

export function GestionTiposDocumentales({ tipos }: { tipos: TipoDocumental[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<TipoDocumental | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarTipoDocumental, null);

  // Estado local de la configuración de aprobación (controla qué controles se ven).
  const [requiereAprob, setRequiereAprob] = useState(true);
  const [requiereN2, setRequiereN2] = useState(false);

  // Al abrir el dialog, sincronizar los checkboxes con el tipo que se edita.
  useEffect(() => {
    if (abierto) {
      const req = editando ? editando.requiereAprobacion : true;
      const dos = editando ? editando.nivelN2 != null : false;
      setRequiereAprob(req);
      setRequiereN2(dos);
    }
  }, [abierto, editando]);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarTipoDocumental(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditando(null); setAbierto(true); }}><Plus className="h-4 w-4" />Nuevo tipo</Button>
      </div>

      {tipos.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell text-center">Aprobación</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell text-center">Acuse</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Nivel</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.codigo}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{t.nombre}</div>
                    {t.descripcion && <div className="text-xs text-muted-foreground line-clamp-1">{t.descripcion}</div>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-center">
                    {t.requiereAprobacion ? <Check className="inline h-4 w-4 text-emerald-600" /> : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-center">
                    {t.requiereAcuseLectura ? <Check className="inline h-4 w-4 text-emerald-600" /> : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{t.nivelJerarquico ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditando(t); setAbierto(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(t.id)} disabled={eliminando === t.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
          <FileType className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay tipos documentales</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Los tipos definen qué clases de documentos existen y cómo se comportan (si requieren aprobación, acuse, etc.).</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar tipo documental" : "Nuevo tipo documental"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="nombre" className="text-sm font-medium">Nombre (singular)</label>
                    <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">El código son 2 a 5 letras mayúsculas (ej: POL, MAN, PRO, FOR).</p>

                <div className="space-y-2">
                  <label htmlFor="nombrePlural" className="text-sm font-medium">Nombre (plural)</label>
                  <input id="nombrePlural" name="nombrePlural" required defaultValue={editando?.nombrePlural ?? ""} placeholder="Ej: Procedimientos" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aprobación</p>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="requiereAprobacion"
                      checked={requiereAprob}
                      onChange={(e) => {
                        setRequiereAprob(e.target.checked);
                        if (!e.target.checked) setRequiereN2(false);
                      }}
                      className="h-4 w-4"
                    />
                    Requiere aprobación
                  </label>

                  {requiereAprob && (
                    <>
                      <div className="grid grid-cols-2 gap-3 pl-6">
                        <div className="space-y-1">
                          <label htmlFor="nivelN1" className="text-xs text-muted-foreground">Nivel del 1er aprobador</label>
                          <select id="nivelN1" name="nivelN1" defaultValue={editando?.nivelN1 ?? "jefatura"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {NIVELES.map((n) => <option key={n} value={n}>{cap(n)}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="nivelRevisor" className="text-xs text-muted-foreground">Nivel del revisor <span className="text-muted-foreground/60">(opcional)</span></label>
                          <select id="nivelRevisor" name="nivelRevisor" defaultValue={editando?.nivelRevisor ?? "analista"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {NIVELES.map((n) => <option key={n} value={n}>{cap(n)}</option>)}
                          </select>
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="requiereSegundoNivel"
                          checked={requiereN2}
                          onChange={(e) => setRequiereN2(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Requiere segundo nivel de aprobación
                      </label>

                      {requiereN2 && (
                        <div className="pl-6">
                          <div className="space-y-1">
                            <label htmlFor="nivelN2" className="text-xs text-muted-foreground">Nivel del 2do aprobador</label>
                            <select id="nivelN2" name="nivelN2" defaultValue={editando?.nivelN2 ?? "gerente"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {NIVELES.map((n) => <option key={n} value={n}>{cap(n)}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!requiereAprob && (
                    <p className="pl-6 text-xs text-muted-foreground">Este tipo se publica sin firma de aprobación.</p>
                  )}

                  <div className="border-t border-border/60 pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" name="requiereAcuseLectura" defaultChecked={editando ? editando.requiereAcuseLectura : false} className="h-4 w-4" />
                      Requiere acuse de lectura del personal
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Valores por defecto al crear un documento</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="frecuenciaRevisionDefault" className="text-xs text-muted-foreground">Revisión</label>
                      <select id="frecuenciaRevisionDefault" name="frecuenciaRevisionDefault" defaultValue={editando?.frecuenciaRevisionDefault ?? "anual"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {FRECUENCIAS.map((f) => <option key={f} value={f}>{cap(f)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="criticidadDefault" className="text-xs text-muted-foreground">Criticidad</label>
                      <select id="criticidadDefault" name="criticidadDefault" defaultValue={editando?.criticidadDefault ?? "medio"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {CRITICIDADES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="confidencialidadDefault" className="text-xs text-muted-foreground">Confidencialidad</label>
                      <select id="confidencialidadDefault" name="confidencialidadDefault" defaultValue={editando?.confidencialidadDefault ?? "interno"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {CONFIDENCIALIDADES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="ordenVisualizacion" className="text-sm font-medium">Orden de visualización</label>
                    <input id="ordenVisualizacion" name="ordenVisualizacion" type="number" min={0} defaultValue={editando?.ordenVisualizacion ?? 0} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="nivelJerarquico" className="text-sm font-medium">Nivel jerárquico <span className="text-muted-foreground">(1-4, opcional)</span></label>
                    <input id="nivelJerarquico" name="nivelJerarquico" type="number" min={1} max={4} defaultValue={editando?.nivelJerarquico ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
