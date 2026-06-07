"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Crown, PenTool, CheckCircle2, CheckCheck, Eye, Network } from "lucide-react";
import type { RolEnProceso } from "@/lib/api/puestos";
import { agregarRolEnProceso, quitarRolEnProceso, type EstadoRol } from "@/app/(app)/configuracion/puestos/[id]/rol-actions";
import { Button } from "@/components/ui/button";

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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Asignando…</> : <><Plus className="h-4 w-4" />Asignar rol</>}
    </Button>
  );
}

export function RolesPuesto({ puestoId, roles, procesos }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoRol, FormData>(agregarRolEnProceso, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); router.refresh(); }
  }, [estado, router]);

  async function quitar(rolId: string) {
    setQuitando(rolId);
    const r = await quitarRolEnProceso(puestoId, rolId);
    setQuitando(null);
    if (r?.ok) router.refresh();
  }

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
                <button type="button" onClick={() => quitar(r.id)} disabled={quitando === r.id} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" title="Quitar rol" aria-label="Quitar rol">
                  {quitando === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
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

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Asignar rol en proceso</h2>
              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="puestoId" value={puestoId} />
                <div className="space-y-2">
                  <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
                  <select id="procesoId" name="procesoId" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Elegí un proceso…</option>
                    {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rol" className="text-sm font-medium">Rol</label>
                  <select id="rol" name="rol" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {estado && !estado.ok && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
