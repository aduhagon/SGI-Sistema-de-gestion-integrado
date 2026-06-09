"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, ListChecks, Search, AlertTriangle } from "lucide-react";
import type { Requisito } from "@/lib/api/normativa";
import { guardarRequisito, eliminarRequisito, type EstadoNormativa } from "@/app/(app)/configuracion/normas/version/[id]/requisito-actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear requisito"}</>}
    </Button>
  );
}

export function GestionRequisitos({ versionId, requisitos }: { versionId: string; requisitos: Requisito[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Requisito | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [oblig, setOblig] = useState(true);
  const [critico, setCritico] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [estado, formAction] = useFormState<EstadoNormativa, FormData>(guardarRequisito, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrir(r: Requisito | null) {
    setEditando(r);
    setOblig(r ? r.esObligatorio : true);
    setCritico(r ? r.esCritico : false);
    setAbierto(true);
  }

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarRequisito(id, versionId);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return requisitos;
    return requisitos.filter((r) =>
      r.clausula.toLowerCase().includes(q) || r.titulo.toLowerCase().includes(q),
    );
  }, [filtro, requisitos]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por cláusula o título…" className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nuevo requisito</Button>
      </div>

      {filtrados.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground w-20">Cláusula</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Requisito</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs align-top">{r.clausula}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.titulo}</span>
                      {r.esCritico && <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive"><AlertTriangle className="h-2.5 w-2.5" />Crítico</span>}
                      {!r.esObligatorio && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">No obligatorio</span>}
                    </div>
                    {r.descripcion && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{r.descripcion}</p>}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrir(r)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => quitar(r.id)} disabled={eliminando === r.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                        {eliminando === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : requisitos.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Ningún requisito coincide con “{filtro}”.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ListChecks className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay requisitos cargados</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Cargá las cláusulas de esta versión de la norma. Después podrás vincular documentos a cada requisito desde el módulo de cumplimiento.</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar requisito" : "Nuevo requisito"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="versionNormaId" value={versionId} />
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="clausula" className="text-sm font-medium">Cláusula</label>
                    <input id="clausula" name="clausula" required defaultValue={editando?.clausula ?? ""} placeholder="8.4" className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label htmlFor="titulo" className="text-sm font-medium">Título</label>
                    <input id="titulo" name="titulo" required defaultValue={editando?.titulo ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={4} defaultValue={editando?.descripcion ?? ""} placeholder="Texto del requisito de la norma…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" name="esObligatorio" checked={oblig} onChange={(e) => setOblig(e.target.checked)} className="h-4 w-4" />
                    Obligatorio
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" name="esCritico" checked={critico} onChange={(e) => setCritico(e.target.checked)} className="h-4 w-4" />
                    Crítico
                  </label>
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
