"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Briefcase } from "lucide-react";
import type { Puesto } from "@/lib/api/configuracion";
import { guardarPuesto, eliminarPuesto, type EstadoConfig } from "@/app/(app)/configuracion/puestos/actions";
import { Button } from "@/components/ui/button";

type AreaOpcion = { id: string; codigo: string; nombre: string };

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear puesto"}</>}
    </Button>
  );
}

export function GestionPuestos({ puestos, areas }: { puestos: Puesto[]; areas: AreaOpcion[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Puesto | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarPuesto, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarPuesto(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditando(null); setAbierto(true); }}><Plus className="h-4 w-4" />Nuevo puesto</Button>
      </div>

      {puestos.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Puesto</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Área</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {puestos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{p.codigo}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/configuracion/puestos/${p.id}`} className="hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {p.areaNombre ?? <span className="text-muted-foreground/50">Sin área</span>}
                  </td>
                  <td className="px-4 py-2.5">
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
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Briefcase className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay puestos cargados</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Los puestos son cargos formales (Jefe de Calidad, Responsable de Producción) que después se asignan a procesos y personas.</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar puesto" : "Nuevo puesto"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="space-y-2">
                  <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                  <input
                    id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""}
                    placeholder="JEFE-CAL"
                    onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">Mayúsculas, números, guion y guion bajo. Entre 2 y 30 caracteres.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-sm font-medium">Nombre del puesto</label>
                  <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} placeholder="Jefe de Calidad" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="areaId" className="text-sm font-medium">Área <span className="text-muted-foreground">(opcional)</span></label>
                  <select id="areaId" name="areaId" defaultValue={editando?.areaId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sin área</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
