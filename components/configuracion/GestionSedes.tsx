"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, MapPin, Star } from "lucide-react";
import type { Sede } from "@/lib/api/configuracion";
import { guardarSede, eliminarSede, type EstadoConfig } from "@/app/(app)/configuracion/sedes/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear sede"}</>}
    </Button>
  );
}

export function GestionSedes({ sedes }: { sedes: Sede[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Sede | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarSede, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarSede(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditando(null); setAbierto(true); }}><Plus className="h-4 w-4" />Nueva sede</Button>
      </div>

      {sedes.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Ubicación</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{s.codigo}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <span className="flex items-center gap-1.5">
                      {s.nombre}
                      {s.esSedePrincipal && <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="Sede principal" />}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {[s.localidad, s.provincia, s.pais].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditando(s); setAbierto(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(s.id)} disabled={eliminando === s.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
          <MapPin className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay sedes cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Las sedes son las ubicaciones físicas de MSU (plantas, oficinas, campos).</p>
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-md">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar sede" : "Nueva sede"}</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input
                      id="codigo"
                      name="codigo"
                      required
                      defaultValue={editando?.codigo ?? ""}
                      placeholder="SEDE-01"
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                    <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} placeholder="Planta Central" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Código: mayúsculas, números, guion y guion bajo. Sin espacios ni puntos.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="localidad" className="text-sm font-medium">Localidad</label>
                    <input id="localidad" name="localidad" defaultValue={editando?.localidad ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="provincia" className="text-sm font-medium">Provincia</label>
                    <input id="provincia" name="provincia" defaultValue={editando?.provincia ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pais" className="text-sm font-medium">País</label>
                    <input id="pais" name="pais" defaultValue={editando?.pais ?? "Argentina"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="tipoSede" className="text-sm font-medium">Tipo de sede <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="tipoSede" name="tipoSede" defaultValue={editando?.tipoSede ?? ""} placeholder="Planta, oficina, campo…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" name="esSedePrincipal" defaultChecked={editando?.esSedePrincipal ?? false} className="h-4 w-4" />
                  Es la sede principal
                </label>
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
