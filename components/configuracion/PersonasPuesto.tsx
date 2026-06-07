"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, UserCircle, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import type { PersonaDePuesto, PersonaCandidata } from "@/lib/api/puestos";
import { asignarPersonaAPuesto, quitarPersonaDePuesto, type EstadoPersona } from "@/app/(app)/configuracion/puestos/[id]/persona-actions";
import { Button } from "@/components/ui/button";

type Gerencia = { id: string; nombre: string };
type AreaF = { id: string; nombre: string; gerenciaId: string | null };

type Props = {
  puestoId: string;
  personas: PersonaDePuesto[];
  candidatas: PersonaCandidata[];
  gerencias: Gerencia[];
  areas: AreaF[];
};

export function PersonasPuesto({ puestoId, personas, candidatas, gerencias, areas }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [resultado, setResultado] = useState<EstadoPersona>(null);

  // Filtros del buscador.
  const [filtroGerencia, setFiltroGerencia] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [texto, setTexto] = useState("");
  const [seleccionada, setSeleccionada] = useState("");

  // Áreas válidas según la gerencia elegida.
  const areasFiltradas = useMemo(
    () => (filtroGerencia ? areas.filter((a) => a.gerenciaId === filtroGerencia) : areas),
    [filtroGerencia, areas],
  );

  // Personas ya asignadas (para no ofrecerlas de nuevo).
  const yaAsignadas = useMemo(() => new Set(personas.map((p) => p.personaId)), [personas]);

  const candidatasFiltradas = useMemo(() => {
    return candidatas.filter((c) => {
      if (yaAsignadas.has(c.id)) return false;
      if (filtroGerencia && c.gerenciaId !== filtroGerencia) return false;
      if (filtroArea && c.areaId !== filtroArea) return false;
      if (texto.trim() && !c.nombre.toLowerCase().includes(texto.trim().toLowerCase())) return false;
      return true;
    });
  }, [candidatas, yaAsignadas, filtroGerencia, filtroArea, texto]);

  useEffect(() => {
    if (resultado?.ok) {
      router.refresh();
      // Si hubo aviso, mantenemos el diálogo para mostrarlo; si no, cerramos.
      if (!resultado.aviso) { setAbierto(false); setResultado(null); }
    }
  }, [resultado, router]);

  async function asignar() {
    if (!seleccionada) return;
    setAsignando(true);
    const fd = new FormData();
    fd.set("puestoId", puestoId);
    fd.set("personaId", seleccionada);
    const r = await asignarPersonaAPuesto(null, fd);
    setAsignando(false);
    setResultado(r);
    setSeleccionada("");
  }

  async function quitar(id: string) {
    setQuitando(id);
    const r = await quitarPersonaDePuesto(puestoId, id);
    setQuitando(null);
    if (r?.ok) router.refresh();
  }

  function cerrar() {
    setAbierto(false); setResultado(null); setSeleccionada("");
    setFiltroGerencia(""); setFiltroArea(""); setTexto("");
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Personas en este puesto {personas.length > 0 && `(${personas.length})`}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />Asignar persona
        </Button>
      </div>

      {personas.length > 0 ? (
        <div className="space-y-2">
          {personas.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{p.personaNombre}</div>
                  {!p.tieneUsuario && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />Sin cuenta de usuario
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => quitar(p.id)} disabled={quitando === p.id} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" title="Quitar" aria-label="Quitar">
                {quitando === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <UserCircle className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Nadie ocupa este puesto todavía</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Al asignar una persona con cuenta, se generan automáticamente sus participaciones
            en los procesos donde el puesto tiene rol.
          </p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={cerrar} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Asignar persona</h2>
              <p className="mt-1 text-sm text-muted-foreground">Filtrá por gerencia y área para encontrar a la persona más rápido.</p>

              {resultado?.ok && resultado.aviso ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{resultado.aviso}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setResultado(null)} className="flex-1">Asignar otra</Button>
                    <Button type="button" onClick={cerrar} className="flex-1">Listo</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Gerencia</label>
                      <select value={filtroGerencia} onChange={(e) => { setFiltroGerencia(e.target.value); setFiltroArea(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Todas</option>
                        {gerencias.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Área</label>
                      <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Todas</option>
                        {areasFiltradas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre…" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>

                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                    {candidatasFiltradas.length > 0 ? (
                      candidatasFiltradas.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted has-[:checked]:bg-primary/10">
                          <input type="radio" name="persona" value={c.id} checked={seleccionada === c.id} onChange={() => setSeleccionada(c.id)} className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{c.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.areaNombre ?? "Sin área"}{c.gerenciaNombre ? ` · ${c.gerenciaNombre}` : ""}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">No hay personas que coincidan con el filtro.</p>
                    )}
                  </div>

                  {resultado && !resultado.ok && (
                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{resultado.error}</div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={cerrar} className="flex-1">Cancelar</Button>
                    <Button type="button" onClick={asignar} disabled={!seleccionada || asignando} className="flex-1">
                      {asignando ? <><Loader2 className="h-4 w-4 animate-spin" />Asignando…</> : <><Plus className="h-4 w-4" />Asignar</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
