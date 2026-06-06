"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Building } from "lucide-react";
import type { Area } from "@/lib/api/configuracion";
import { guardarArea, eliminarArea, type EstadoConfig } from "@/app/(app)/configuracion/areas/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear área"}</>}
    </Button>
  );
}

type Gerencia = { id: string; codigo: string; nombre: string };

export function GestionAreas({ areas, gerencias }: { areas: Area[]; gerencias: Gerencia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Area | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarArea, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrirNueva() { setEditando(null); setAbierto(true); }
  function abrirEdicion(a: Area) { setEditando(a); setAbierto(true); }

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarArea(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={abrirNueva}><Plus className="h-4 w-4" />Nueva área</Button>
      </div>

      {areas.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Gerencia</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{a.codigo}</td>
                  <td className="px-4 py-2.5 font-medium">{a.nombre}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {a.gerenciaNombre ?? <span className="text-muted-foreground/50">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEdicion(a)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(a.id)} disabled={eliminando === a.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
          <Building className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay áreas cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Las áreas representan las unidades organizativas de la empresa (RRHH, Calidad, Producción…).</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar área" : "Nueva área"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="space-y-2">
                  <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                  <input
                    id="codigo"
                    name="codigo"
                    required
                    defaultValue={editando?.codigo ?? ""}
                    placeholder="Ej: RRHH, CAL, PROD"
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mayúsculas, números, guion (-) y guion bajo (_). Sin espacios ni puntos. Entre 2 y 20 caracteres.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                  <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} placeholder="Ej: Recursos Humanos" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={2} defaultValue={editando?.descripcion ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="gerenciaId" className="text-sm font-medium">
                    Gerencia <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <select
                    id="gerenciaId"
                    name="gerenciaId"
                    defaultValue={editando?.gerenciaId ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sin gerencia asignada</option>
                    {gerencias
                      .filter((g) => g.id !== editando?.id)
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                      ))}
                  </select>
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
