"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Briefcase, Building, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
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

  const arbol = useMemo(() => construirArbol(puestos), [puestos]);

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
        <div className="space-y-3">
          {arbol.map((ger) => (
            <GrupoGerencia
              key={ger.clave}
              titulo={ger.titulo}
              areas={ger.areas}
              onEditar={(p) => { setEditando(p); setAbierto(true); }}
              onEliminar={quitar}
              eliminando={eliminando}
            />
          ))}
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
                  <label htmlFor="reportaAId" className="text-sm font-medium">Reporta a <span className="text-muted-foreground">(opcional)</span></label>
                  <select id="reportaAId" name="reportaAId" defaultValue={editando?.reportaAId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sin superior jerárquico</option>
                    {puestos
                      .filter((sup) => sup.id !== editando?.id)
                      .map((sup) => <option key={sup.id} value={sup.id}>{sup.codigo} · {sup.nombre}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">El puesto al que este reporta en la cadena jerárquica.</p>
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

// ---- Agrupamiento gerencia -> área -> puestos ----

const ORDEN_GERENCIAS = [
  "Gerencia General",
  "Gerencia Producción Agrícola",
  "Gerencia Producción Industrial",
  "Gerencia Comercial",
  "Gerencia Financiera",
  "Gerencia de Administración",
];

function ordenGerencia(titulo: string): number {
  const i = ORDEN_GERENCIAS.indexOf(titulo);
  return i === -1 ? ORDEN_GERENCIAS.length : i;
}

type AreaGrupo = { clave: string; titulo: string; puestos: Puesto[] };
type GerenciaGrupo = { clave: string; titulo: string; areas: AreaGrupo[] };

function construirArbol(puestos: Puesto[]): GerenciaGrupo[] {
  // gerencia -> (área -> puestos)
  const porGer = new Map<string, { titulo: string; areas: Map<string, AreaGrupo> }>();

  const claveGer = (p: Puesto) => p.gerenciaId ?? (p.gerenciaNombre ? "n:" + p.gerenciaNombre : "__sin_ger__");
  const tituloGer = (p: Puesto) => p.gerenciaNombre ?? "Sin gerencia asignada";
  const claveArea = (p: Puesto) => p.areaId ?? (p.areaNombre ? "n:" + p.areaNombre : "__sin_area__");
  const tituloArea = (p: Puesto) => p.areaNombre ?? "Sin área asignada";

  for (const p of puestos) {
    const gk = claveGer(p);
    if (!porGer.has(gk)) porGer.set(gk, { titulo: tituloGer(p), areas: new Map() });
    const ger = porGer.get(gk)!;
    const ak = claveArea(p);
    if (!ger.areas.has(ak)) ger.areas.set(ak, { clave: ak, titulo: tituloArea(p), puestos: [] });
    ger.areas.get(ak)!.puestos.push(p);
  }

  const lista: GerenciaGrupo[] = Array.from(porGer.entries()).map(([clave, g]) => ({
    clave,
    titulo: g.titulo,
    areas: Array.from(g.areas.values()).sort((a, b) => a.titulo.localeCompare(b.titulo)),
  }));

  lista.sort((x, y) => {
    // "Sin gerencia" siempre al final.
    const sx = x.titulo === "Sin gerencia asignada" ? 1 : 0;
    const sy = y.titulo === "Sin gerencia asignada" ? 1 : 0;
    if (sx !== sy) return sx - sy;
    const ox = ordenGerencia(x.titulo);
    const oy = ordenGerencia(y.titulo);
    if (ox !== oy) return ox - oy;
    return x.titulo.localeCompare(y.titulo);
  });

  return lista;
}

function GrupoGerencia({
  titulo,
  areas,
  onEditar,
  onEliminar,
  eliminando,
}: {
  titulo: string;
  areas: AreaGrupo[];
  onEditar: (p: Puesto) => void;
  onEliminar: (id: string) => void;
  eliminando: string | null;
}) {
  const [abierto, setAbierto] = useState(true);
  const total = areas.reduce((s, a) => s + a.puestos.length, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        {abierto ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 font-medium text-sm">{titulo}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {total} {total === 1 ? "puesto" : "puestos"}
        </span>
      </button>

      {abierto && (
        <div className="divide-y divide-border border-t border-border">
          {areas.map((a) => (
            <AreaSub key={a.clave} area={a} onEditar={onEditar} onEliminar={onEliminar} eliminando={eliminando} />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaSub({
  area,
  onEditar,
  onEliminar,
  eliminando,
}: {
  area: AreaGrupo;
  onEditar: (p: Puesto) => void;
  onEliminar: (id: string) => void;
  eliminando: string | null;
}) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 pl-8 text-left transition-colors hover:bg-muted/30"
      >
        {abierto ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="flex-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{area.titulo}</span>
        <span className="text-[10px] text-muted-foreground">{area.puestos.length}</span>
      </button>

      {abierto && (
        <table className="w-full text-sm">
          <tbody>
            {area.puestos.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2 pl-12 font-mono text-xs w-32">{p.codigo}</td>
                <td className="px-4 py-2 font-medium">
                  <Link href={`/configuracion/puestos/${p.id}`} className="hover:underline">{p.nombre}</Link>
                </td>
                <td className="px-4 py-2 text-xs">
                  {p.reportaACodigo ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CornerDownRight className="h-3 w-3 shrink-0" />
                      <span className="font-mono">{p.reportaACodigo}</span>
                      <span>{p.reportaANombre}</span>
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/60">— sin superior —</span>
                  )}
                </td>
                <td className="px-4 py-2 w-20">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditar(p)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onEliminar(p.id)} disabled={eliminando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                      {eliminando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
