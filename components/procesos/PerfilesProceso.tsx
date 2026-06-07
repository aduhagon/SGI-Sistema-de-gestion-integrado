"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Loader2, UserPlus, Users, Crown, PenTool, CheckCircle2, CheckCheck, Eye } from "lucide-react";
import type { Participacion, UsuarioParaAsignar } from "@/lib/api/participaciones";
import { asignarParticipacion, type EstadoParticipacion } from "@/app/(app)/procesos/[codigo]/participacion-actions";
import { Button } from "@/components/ui/button";

type Props = {
  procesoId: string;
  participaciones: Participacion[];
  usuarios: UsuarioParaAsignar[];
};

const ROLES = [
  { value: "responsable_proceso", label: "Responsable del proceso", icon: Crown, color: "#7c3aed", desc: "Dueño del proceso y su documentación." },
  { value: "elaborador", label: "Elaborador", icon: PenTool, color: "#0284c7", desc: "Redacta y versiona documentos." },
  { value: "aprobador_n1", label: "Aprobador N1", icon: CheckCircle2, color: "#d97706", desc: "Primer nivel de aprobación." },
  { value: "aprobador_n2", label: "Aprobador N2", icon: CheckCheck, color: "#059669", desc: "Segundo nivel de aprobación." },
  { value: "lector", label: "Lector", icon: Eye, color: "#6b7280", desc: "Consulta y acusa lectura." },
];

const ROL_META = Object.fromEntries(ROLES.map((r) => [r.value, r]));

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Asignando…</> : <><UserPlus className="h-4 w-4" />Asignar perfil</>}
    </Button>
  );
}

export function PerfilesProceso({ procesoId, participaciones, usuarios }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useFormState<EstadoParticipacion, FormData>(asignarParticipacion, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); router.refresh(); }
  }, [estado, router]);

  // Agrupar participaciones por rol.
  const porRol = participaciones.reduce<Record<string, Participacion[]>>((acc, p) => {
    (acc[p.rol] ??= []).push(p);
    return acc;
  }, {});

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Perfiles funcionales del proceso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Los perfiles que asignes acá aplican a toda la documentación de este proceso:
            procedimientos, instructivos y anexos.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />Asignar perfil
        </Button>
      </div>

      {participaciones.length > 0 ? (
        <div className="space-y-4">
          {ROLES.map((rol) => {
            const personas = porRol[rol.value] ?? [];
            if (personas.length === 0) return null;
            const Icon = rol.icon;
            return (
              <div key={rol.value} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${rol.color}15`, color: rol.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-sm font-medium">{rol.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{rol.desc}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {personas.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {p.usuarioNombre}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <Users className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Este proceso no tiene perfiles asignados</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Asigná quién es responsable, elaborador, aprobador N1, N2 y lector. Sin
            aprobadores asignados, los documentos de este proceso no podrán enviarse a aprobación.
          </p>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Asignar perfil</h2>
              <p className="mt-1 text-sm text-muted-foreground">Asigná un usuario con un rol funcional en este proceso.</p>
              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="procesoId" value={procesoId} />
                <div className="space-y-2">
                  <label htmlFor="usuarioId" className="text-sm font-medium">Usuario</label>
                  <select id="usuarioId" name="usuarioId" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Elegí un usuario…</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rol" className="text-sm font-medium">Rol funcional</label>
                  <select id="rol" name="rol" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="motivoAsignacion" className="text-sm font-medium">Motivo <span className="text-muted-foreground">(opcional)</span></label>
                  <input id="motivoAsignacion" name="motivoAsignacion" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
