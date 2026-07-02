"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, Building, ChevronDown, ChevronRight } from "lucide-react";
import type { Area } from "@/lib/api/configuracion";
import { guardarArea, eliminarArea, type EstadoConfig } from "@/app/(app)/configuracion/areas/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear área"}</>}
    </Button>
  );
}

type Gerencia = { id: string; codigo: string; nombre: string };

// Orden de negocio para mostrar las gerencias (no alfabético).
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
  // Las que no están en la lista van al final, alfabéticas entre sí.
  return i === -1 ? ORDEN_GERENCIAS.length : i;
}

export function GestionAreas({ areas, gerencias }: { areas: Area[]; gerencias: Gerencia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Area | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(guardarArea, null);

  // Agrupar las áreas por gerencia. Las gerencias mismas (código GER-*) y las
  // áreas sin gerencia van a un grupo aparte para no perderlas.
  const grupos = useMemo(() => {
    const porGerencia = new Map<string, { titulo: string; areas: Area[] }>();
    const sinGerencia: Area[] = [];

    for (const a of areas) {
      // Una "gerencia" (área cuyo código empieza con GER-) no se agrupa dentro de
      // otra: encabeza su propio grupo. El resto se agrupa por su gerencia padre.
      if (a.gerenciaNombre) {
        const clave = a.gerenciaId ?? a.gerenciaNombre;
        if (!porGerencia.has(clave)) {
          porGerencia.set(clave, { titulo: a.gerenciaNombre, areas: [] });
        }
        porGerencia.get(clave)!.areas.push(a);
      } else {
        sinGerencia.push(a);
      }
    }

    const lista = Array.from(porGerencia.entries())
      .map(([clave, g]) => ({ clave, titulo: g.titulo, areas: g.areas }))
      .sort((x, y) => {
        const ox = ordenGerencia(x.titulo);
        const oy = ordenGerencia(y.titulo);
        if (ox !== oy) return ox - oy;
        return x.titulo.localeCompare(y.titulo);
      });

    if (sinGerencia.length > 0) {
      lista.push({ clave: "__sin__", titulo: "Sin gerencia asignada", areas: sinGerencia });
    }
    return lista;
  }, [areas]);

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
        <div className="space-y-3">
          {grupos.map((grupo) => (
            <GrupoGerencia
              key={grupo.clave}
              titulo={grupo.titulo}
              areas={grupo.areas}
              onEditar={abrirEdicion}
              onEliminar={quitar}
              eliminando={eliminando}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Building className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay áreas cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Las áreas representan las unidades organizativas de la empresa (RRHH, Calidad, Producción…).</p>
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-md">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar área" : "Nueva área"}</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
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

function GrupoGerencia({
  titulo,
  areas,
  onEditar,
  onEliminar,
  eliminando,
}: {
  titulo: string;
  areas: Area[];
  onEditar: (a: Area) => void;
  onEliminar: (id: string) => void;
  eliminando: string | null;
}) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        {abierto ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 font-medium text-sm">{titulo}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {areas.length} {areas.length === 1 ? "área" : "áreas"}
        </span>
      </button>

      {abierto && (
        <table className="w-full text-sm">
          <tbody>
            {areas.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-mono text-xs w-32">{a.codigo}</td>
                <td className="px-4 py-2.5 font-medium">{a.nombre}</td>
                <td className="px-4 py-2.5 w-20">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditar(a)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onEliminar(a.id)} disabled={eliminando === a.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                      {eliminando === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
