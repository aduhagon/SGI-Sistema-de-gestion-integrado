"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, ShieldAlert, TrendingUp, Search } from "lucide-react";
import type { Riesgo, ProcesoOpcion, PuestoOpcion } from "@/lib/api/riesgos";
import { clasificarNivel, type NivelRiesgo } from "@/lib/riesgos-utils";
import { guardarRiesgo, eliminarRiesgo, type EstadoRiesgo } from "@/app/(app)/riesgos/actions";
import { Button } from "@/components/ui/button";

const NIVEL_COLOR: Record<NivelRiesgo, string> = {
  bajo: "bg-emerald-100 text-emerald-700",
  medio: "bg-amber-100 text-amber-700",
  alto: "bg-orange-100 text-orange-700",
  extremo: "bg-red-100 text-red-700",
};
const NIVEL_LABEL: Record<NivelRiesgo, string> = {
  bajo: "Bajo", medio: "Medio", alto: "Alto", extremo: "Extremo",
};
const ESTADOS = ["identificado", "en_tratamiento", "controlado", "materializado", "cerrado"];
const TRATAMIENTOS = ["evitar", "mitigar", "transferir", "aceptar", "explotar"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear riesgo"}</>}
    </Button>
  );
}

function celdaColor(nivel: NivelRiesgo): string {
  if (nivel === "bajo") return "bg-emerald-200";
  if (nivel === "medio") return "bg-amber-200";
  if (nivel === "alto") return "bg-orange-200";
  return "bg-red-300";
}

export function GestionRiesgos({ riesgos, procesos, puestos }: {
  riesgos: Riesgo[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editando, setEditando] = useState<Riesgo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [prob, setProb] = useState(3);
  const [imp, setImp] = useState(3);
  const [estado, formAction] = useFormState<EstadoRiesgo, FormData>(guardarRiesgo, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrir(r: Riesgo | null) {
    setEditando(r);
    setProb(r ? r.probabilidad : 3);
    setImp(r ? r.impacto : 3);
    setAbierto(true);
  }

  // Apertura automática del modal cuando se llega con ?riesgo=<id> (ej. desde la ficha del proceso).
  useEffect(() => {
    const riesgoId = searchParams.get("riesgo");
    if (!riesgoId) return;
    const r = riesgos.find((x) => x.id === riesgoId);
    if (r) {
      abrir(r);
      // Limpiamos el query param para que un refresh no reabra el modal.
      router.replace("/riesgos", { scroll: false });
    }
  }, [searchParams, riesgos, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarRiesgo(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return riesgos;
    return riesgos.filter((r) =>
      r.codigo.toLowerCase().includes(q) || r.titulo.toLowerCase().includes(q) || r.procesoNombre.toLowerCase().includes(q),
    );
  }, [filtro, riesgos]);

  const nivelActual = clasificarNivel(prob, imp);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm sm:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por código, título o proceso…" className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nuevo riesgo</Button>
      </div>

      {filtrados.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Riesgo</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Proceso</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Nivel</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Estado</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs align-top">{r.codigo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      {r.categoria === "oportunidad" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />}
                      {r.titulo}
                    </div>
                    {r.responsableNombre && <div className="text-xs text-muted-foreground">Resp.: {r.responsableNombre}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{r.procesoNombre}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${NIVEL_COLOR[r.nivel]}`}>
                      {NIVEL_LABEL[r.nivel]} ({r.nivelNumerico})
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell text-xs">{cap(r.estado)}</td>
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
      ) : riesgos.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Ningún riesgo coincide con “{filtro}”.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ShieldAlert className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay riesgos registrados</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">Identificá los riesgos y oportunidades de cada proceso (ISO 9001 cláusula 6.1). Cada uno se evalúa por probabilidad e impacto.</p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar riesgo" : "Nuevo riesgo"}</h2>
              <form action={formAction} className="mt-6 space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required defaultValue={editando?.codigo ?? ""} placeholder="R-COM-01"
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="categoria" className="text-sm font-medium">Categoría</label>
                    <select id="categoria" name="categoria" defaultValue={editando?.categoria ?? "riesgo"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="riesgo">Riesgo</option>
                      <option value="oportunidad">Oportunidad</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="estado" className="text-sm font-medium">Estado</label>
                    <select id="estado" name="estado" defaultValue={editando?.estado ?? "identificado"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {ESTADOS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="titulo" className="text-sm font-medium">Título</label>
                  <input id="titulo" name="titulo" required defaultValue={editando?.titulo ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
                    <select id="procesoId" name="procesoId" required defaultValue={editando?.procesoId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Elegí un proceso…</option>
                      {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="responsableId" className="text-sm font-medium">Puesto responsable <span className="text-muted-foreground">(opc.)</span></label>
                    <select id="responsableId" name="responsableId" defaultValue={editando?.responsableId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Sin asignar</option>
                      {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="causa" className="text-sm font-medium">Causa <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="causa" name="causa" rows={2} defaultValue={editando?.causa ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="consecuencia" className="text-sm font-medium">Consecuencia <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="consecuencia" name="consecuencia" rows={2} defaultValue={editando?.consecuencia ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Evaluación del riesgo</p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <label htmlFor="probabilidad" className="flex justify-between text-sm"><span>Probabilidad</span><span className="font-medium">{prob}</span></label>
                        <input id="probabilidad" name="probabilidad" type="range" min={1} max={5} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="impacto" className="flex justify-between text-sm"><span>Impacto</span><span className="font-medium">{imp}</span></label>
                        <input id="impacto" name="impacto" type="range" min={1} max={5} value={imp} onChange={(e) => setImp(Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-sm text-muted-foreground">Nivel resultante:</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${NIVEL_COLOR[nivelActual.nivel]}`}>
                          {NIVEL_LABEL[nivelActual.nivel]} ({nivelActual.numerico})
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className="grid grid-cols-5 gap-0.5">
                        {[5, 4, 3, 2, 1].map((iVal) =>
                          [1, 2, 3, 4, 5].map((pVal) => {
                            const cls = clasificarNivel(pVal, iVal);
                            const activa = pVal === prob && iVal === imp;
                            return (
                              <div key={`${pVal}-${iVal}`}
                                className={`flex h-7 w-7 items-center justify-center rounded-sm text-[10px] ${celdaColor(cls.nivel)} ${activa ? "ring-2 ring-foreground ring-offset-1" : "opacity-70"}`}
                                title={`P${pVal} × I${iVal} = ${cls.numerico}`}>
                                {pVal * iVal}
                              </div>
                            );
                          }),
                        )}
                      </div>
                      <p className="mt-1 text-center text-[10px] text-muted-foreground">Probabilidad → / Impacto ↑</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="tipoTratamiento" className="text-sm font-medium">Tratamiento <span className="text-muted-foreground">(opc.)</span></label>
                    <select id="tipoTratamiento" name="tipoTratamiento" defaultValue={editando?.tipoTratamiento ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Sin definir</option>
                      {TRATAMIENTOS.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fechaRevision" className="text-sm font-medium">Próxima revisión <span className="text-muted-foreground">(opc.)</span></label>
                    <input id="fechaRevision" name="fechaRevision" type="date" defaultValue={editando?.fechaRevision ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tratamientoPlanificado" className="text-sm font-medium">Plan de tratamiento <span className="text-muted-foreground">(opc.)</span></label>
                  <textarea id="tratamientoPlanificado" name="tratamientoPlanificado" rows={2} defaultValue={editando?.tratamientoPlanificado ?? ""} placeholder="Acciones para abordar este riesgo…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
