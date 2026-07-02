"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Crown, PenTool, CheckCircle2, CheckCheck, Eye, Network, AlertCircle, Search } from "lucide-react";
import type { RolEnProceso } from "@/lib/api/puestos";
import { agregarRolEnProcesosMultiple, quitarRolEnProceso } from "@/app/(app)/configuracion/puestos/[id]/rol-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError } from "@/components/ui/modal";

type ProcOpcion = { id: string; codigo: string; nombre: string; tipo: string };

type Props = {
  puestoId: string;
  roles: RolEnProceso[];
  procesos: ProcOpcion[];
};

const ROL_META: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  responsable_proceso: { label: "Responsable", icon: Crown, color: "#7c3aed" },
  elaborador: { label: "Elaborador", icon: PenTool, color: "#0284c7" },
  aprobador_n1: { label: "Aprobador N1", icon: CheckCircle2, color: "#d97706" },
  aprobador_n2: { label: "Aprobador N2", icon: CheckCheck, color: "#059669" },
  lector: { label: "Lector", icon: Eye, color: "#6b7280" },
};

const ROLES = [
  { value: "responsable_proceso", label: "Responsable del proceso" },
  { value: "elaborador", label: "Elaborador" },
  { value: "aprobador_n1", label: "Aprobador N1" },
  { value: "aprobador_n2", label: "Aprobador N2" },
  { value: "lector", label: "Lector" },
];

export function RolesPuesto({ puestoId, roles, procesos }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  // Estado del formulario múltiple.
  const [rol, setRol] = useState<string>("lector");
  const [motivo, setMotivo] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Baja con motivo.
  const [aQuitar, setAQuitar] = useState<RolEnProceso | null>(null);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [quitando, setQuitando] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  // Procesos donde el puesto YA tiene el rol elegido (activo) → no se ofrecen.
  const yaConEseRol = useMemo(() => {
    const s = new Set<string>();
    for (const r of roles) {
      if (r.rol === rol) s.add(r.procesoId);
    }
    return s;
  }, [roles, rol]);

  // Procesos disponibles para el rol elegido, filtrados por búsqueda.
  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return procesos
      .filter((p) => !yaConEseRol.has(p.id))
      .filter((p) => !q || `${p.codigo} ${p.nombre}`.toLowerCase().includes(q));
  }, [procesos, yaConEseRol, busqueda]);

  // Al cambiar de rol, limpiar selecciones que ya no aplican.
  useEffect(() => {
    setSeleccion((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (!yaConEseRol.has(id)) next.add(id);
      return next;
    });
  }, [yaConEseRol]);

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSeleccion((prev) => {
      if (disponibles.every((p) => prev.has(p.id))) return new Set();
      return new Set(disponibles.map((p) => p.id));
    });
  }

  function cerrar() {
    setAbierto(false);
    setSeleccion(new Set());
    setMotivo("");
    setBusqueda("");
    setErrorForm(null);
  }

  async function confirmarAsignar() {
    setErrorForm(null);
    if (seleccion.size === 0) { setErrorForm("Elegí al menos un proceso."); return; }
    if (motivo.trim().length < 5) { setErrorForm("El motivo es obligatorio (mínimo 5 caracteres)."); return; }

    setGuardando(true);
    try {
      const r = await agregarRolEnProcesosMultiple(puestoId, Array.from(seleccion), rol, motivo.trim());
      if (r?.ok) {
        cerrar();
        router.refresh();
      } else {
        setErrorForm(r && !r.ok ? r.error : "No se pudo asignar.");
      }
    } catch (e) {
      setErrorForm(e instanceof Error ? `Error: ${e.message}` : "Error inesperado al asignar.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarQuitar() {
    if (!aQuitar) return;
    setQuitando(true);
    setErrorBaja(null);
    const r = await quitarRolEnProceso(puestoId, aQuitar.id, motivoBaja);
    setQuitando(false);
    if (r?.ok) {
      setAQuitar(null);
      setMotivoBaja("");
      router.refresh();
    } else {
      setErrorBaja(r && !r.ok ? r.error : "No se pudo quitar el rol.");
    }
  }

  const todosSeleccionados = disponibles.length > 0 && disponibles.every((p) => seleccion.has(p.id));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Roles en procesos {roles.length > 0 && `(${roles.length})`}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />Asignar rol
        </Button>
      </div>

      {roles.length > 0 ? (
        <div className="space-y-2">
          {roles.map((r) => {
            const meta = ROL_META[r.rol] ?? ROL_META.lector;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-muted-foreground">en</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.procesoCodigo}</span>
                      <span className="font-medium">{r.procesoNombre}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setAQuitar(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Quitar rol" aria-label="Quitar rol">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <Network className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Este puesto no tiene roles en procesos</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Asigná en qué procesos participa este puesto y con qué rol. Un mismo puesto
            puede ser aprobador en un proceso y elaborador en otro.
          </p>
        </div>
      )}

      {/* Diálogo: asignar rol a varios procesos */}
      <ModalShell abierto={abierto} onClose={cerrar} maxWidth="max-w-lg">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Asignar rol en procesos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí un rol y marcá todos los procesos donde el puesto lo cumple. Se asignan todos juntos.
          </p>
        </ModalHeader>

        <ModalBody className="space-y-4 pb-3">
              <div className="space-y-2">
                <label htmlFor="rol" className="text-sm font-medium">Rol</label>
                <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Procesos {seleccion.size > 0 && <span className="text-muted-foreground">({seleccion.size} seleccionados)</span>}
                  </label>
                  {disponibles.length > 0 && (
                    <button type="button" onClick={toggleTodos} className="text-xs text-primary hover:underline">
                      {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                    </button>
                  )}
                </div>

                {procesos.filter((p) => !yaConEseRol.has(p.id)).length > 6 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar proceso…"
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                )}

                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {disponibles.length > 0 ? disponibles.map((p) => {
                    const marcado = seleccion.has(p.id);
                    return (
                      <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${marcado ? "bg-primary/5" : "hover:bg-muted"}`}>
                        <input type="checkbox" checked={marcado} onChange={() => toggle(p.id)}
                          className="h-4 w-4 rounded border-input accent-primary" />
                        <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                        <span className="font-medium">{p.nombre}</span>
                      </label>
                    );
                  }) : (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      {busqueda
                        ? "Ningún proceso coincide con la búsqueda."
                        : "El puesto ya tiene este rol en todos los procesos disponibles."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="motivo" className="text-sm font-medium">Motivo de la asignación</label>
                <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} minLength={5}
                  placeholder="Por qué se asigna este rol (queda en la auditoría)."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <p className="text-xs text-muted-foreground">Se registra el mismo motivo para todos los procesos seleccionados.</p>
              </div>

        </ModalBody>

        <ModalFooter>
          <ModalError mensaje={errorForm} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={cerrar} className="flex-1">Cancelar</Button>
            <Button type="button" onClick={confirmarAsignar} disabled={guardando || seleccion.size === 0 || motivo.trim().length < 5} className="flex-1">
              {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Asignando…</>
                : <><Plus className="h-4 w-4" />Asignar {seleccion.size > 0 ? `(${seleccion.size})` : ""}</>}
            </Button>
          </div>
        </ModalFooter>
      </ModalShell>

      {/* Diálogo: quitar rol con motivo */}
      {aQuitar && (
        <ModalShell abierto onClose={() => { setAQuitar(null); setMotivoBaja(""); setErrorBaja(null); }} maxWidth="max-w-md">
          <ModalHeader>
            <h3 className="font-serif text-xl font-semibold tracking-tight">Quitar rol en proceso</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vas a quitar el rol{" "}
              <span className="font-medium text-foreground">{ROL_META[aQuitar.rol]?.label ?? aQuitar.rol}</span>{" "}
              en{" "}
              <span className="font-medium text-foreground">{aQuitar.procesoNombre}</span>.
              El registro no se borra: se cierra su vigencia y queda en el historial.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2 pb-1">
              <label htmlFor="motivoBaja" className="text-sm font-medium">Motivo de la baja</label>
              <textarea id="motivoBaja" value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} rows={3}
                placeholder="Por qué se quita este rol (queda en la auditoría)."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" autoFocus />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={errorBaja} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAQuitar(null); setMotivoBaja(""); setErrorBaja(null); }}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmarQuitar} disabled={quitando || motivoBaja.trim().length < 5}>
                {quitando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Quitar
              </Button>
            </div>
          </ModalFooter>
        </ModalShell>
      )}
    </section>
  );
}
