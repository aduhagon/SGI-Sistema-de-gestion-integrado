"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Users, Plus, Loader2, Trash2, Crown, Eye, UserCheck } from "lucide-react";
import type { MiembroEquipo, CandidatoEquipo } from "@/lib/api/auditoria-equipo";
import {
  agregarMiembroEquipo, quitarMiembroEquipo, type EstadoEquipo,
} from "@/app/(app)/auditorias/[id]/equipo-actions";
import { Button } from "@/components/ui/button";
import {
  ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS,
} from "@/components/ui/modal";

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROL_META: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  lider: { label: "Auditor líder", color: "#7c3aed", icon: Crown },
  auditor: { label: "Auditor", color: "#0284c7", icon: UserCheck },
  observador: { label: "Observador", color: "#6b7280", icon: Eye },
};

type Props = {
  auditoriaId: string;
  equipo: MiembroEquipo[];
  candidatos: CandidatoEquipo[];
  puedeGestionar: boolean;
  estadoAuditoria: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Agregando…</> : <><Plus className="h-4 w-4" />Agregar</>}
    </Button>
  );
}

export function SeccionEquipo({ auditoriaId, equipo, candidatos, puedeGestionar, estadoAuditoria }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"interno" | "externo">("interno");
  const [estado, formAction] = useFormState<EstadoEquipo, FormData>(agregarMiembroEquipo, null);
  const [quitando, setQuitando] = useState<string | null>(null);

  useEffect(() => {
    if (estado?.ok) {
      setAbierto(false);
      router.refresh();
    }
  }, [estado, router]);

  async function quitar(id: string) {
    setQuitando(id);
    const r = await quitarMiembroEquipo(auditoriaId, id);
    setQuitando(null);
    if (r?.ok) router.refresh();
  }

  // Solo se edita el equipo mientras la auditoría no está cerrada/cancelada.
  const editable = puedeGestionar && ["planificada", "en_curso"].includes(estadoAuditoria);
  const yaEnEquipo = new Set(equipo.filter((m) => m.usuarioId).map((m) => m.usuarioId));
  const disponibles = candidatos.filter((c) => !yaEnEquipo.has(c.usuarioId));

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Equipo auditor {equipo.length > 0 && `(${equipo.length})`}
        </h2>
        {editable && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Sumar integrante
          </Button>
        )}
      </div>

      {equipo.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {equipo.map((m) => {
            const meta = ROL_META[m.rol] ?? ROL_META.auditor;
            const Icon = meta.icon;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {m.nombre}
                    {m.esExterno && (
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Externo
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs" style={{ color: meta.color }}>{meta.label}</div>
                  {(m.email || m.organizacion) && (
                    <div className="truncate text-xs text-muted-foreground">
                      {[m.organizacion, m.email].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                {editable && (
                  <button
                    type="button" onClick={() => quitar(m.id)} disabled={quitando === m.id}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Quitar" aria-label="Quitar"
                  >
                    {quitando === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {editable
            ? "Sin integrantes. Sumá al menos un auditor líder: es quien aprueba el cierre."
            : "Todavía no se asignó el equipo auditor."}
        </p>
      )}

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">Sumar integrante al equipo</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button" onClick={() => setModo("interno")}
              className={`rounded-md px-3 py-1.5 text-sm ${modo === "interno" ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
            >
              Usuario interno
            </button>
            <button
              type="button" onClick={() => setModo("externo")}
              className={`rounded-md px-3 py-1.5 text-sm ${modo === "externo" ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
            >
              Auditor externo
            </button>
          </div>
        </ModalHeader>
        <form action={formAction} className={MODAL_FORM_CLASS}>
          <input type="hidden" name="auditoriaId" value={auditoriaId} />
          <input type="hidden" name="modo" value={modo} />
          <ModalBody>
            {modo === "interno" ? (
              <div className="mb-3">
                <label htmlFor="usuarioId" className="mb-1 block text-sm font-medium">Usuario</label>
                <select id="usuarioId" name="usuarioId" className={INPUT_CLASS} required>
                  <option value="">Elegí un usuario…</option>
                  {disponibles.map((c) => (
                    <option key={c.usuarioId} value={c.usuarioId}>
                      {c.nombre}{c.email ? ` · ${c.email}` : ""}
                    </option>
                  ))}
                </select>
                {disponibles.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No hay más usuarios con perfil auditor disponibles.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label htmlFor="nombreExterno" className="mb-1 block text-sm font-medium">Nombre</label>
                  <input id="nombreExterno" name="nombreExterno" className={INPUT_CLASS} placeholder="Nombre y apellido" />
                </div>
                <div className="mb-3">
                  <label htmlFor="organizacionExterna" className="mb-1 block text-sm font-medium">Organización</label>
                  <input id="organizacionExterna" name="organizacionExterna" className={INPUT_CLASS} placeholder="Ente certificador, consultora…" />
                </div>
                <div className="mb-3">
                  <label htmlFor="emailExterno" className="mb-1 block text-sm font-medium">Email</label>
                  <input id="emailExterno" name="emailExterno" type="email" className={INPUT_CLASS} placeholder="opcional" />
                </div>
              </>
            )}
            <div className="mb-3">
              <label htmlFor="rol" className="mb-1 block text-sm font-medium">Rol en la auditoría</label>
              <select id="rol" name="rol" className={INPUT_CLASS} defaultValue="auditor" required>
                <option value="lider">Auditor líder (aprueba el cierre)</option>
                <option value="auditor">Auditor</option>
                <option value="observador">Observador</option>
              </select>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAbierto(false)}>Cancelar</Button>
              <SubmitButton />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </section>
  );
}
