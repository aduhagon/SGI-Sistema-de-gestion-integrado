"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  UserCog,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { AprobacionAdmin, UsuarioOpcion } from "@/lib/api/aprobacionesAdmin";
import { reasignarAprobador } from "@/app/(app)/aprobaciones/reasignar-actions";

export function AprobacionesAdmin({
  aprobaciones,
  usuarios,
}: {
  aprobaciones: AprobacionAdmin[];
  usuarios: UsuarioOpcion[];
}) {
  const router = useRouter();
  const [reasignando, setReasignando] = useState<AprobacionAdmin | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  if (aprobaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-medium text-foreground">No hay aprobaciones pendientes en el sistema</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando se envíe un documento a aprobación, va a aparecer acá.
        </p>
      </div>
    );
  }

  const vencidas = aprobaciones.filter((a) => a.vencida).length;

  return (
    <div>
      {exito && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{exito}</span>
        </div>
      )}

      {/* Resumen */}
      <div className="mb-5 flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">
          {aprobaciones.length} aprobación{aprobaciones.length !== 1 ? "es" : ""} pendiente
          {aprobaciones.length !== 1 ? "s" : ""} en total
        </span>
        {vencidas > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {vencidas} vencida{vencidas !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {aprobaciones.map((a) => (
          <div
            key={a.aprobacionId}
            className={
              "rounded-lg border p-4 " +
              (a.vencida ? "border-l-2 border-l-rose-400 bg-rose-50/40 border-y-border border-r-border" : "border-border bg-card")
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{a.codigo}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    v{a.numeroVersion}
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Nivel {a.nivelPendiente}
                  </span>
                </div>
                <div className="mt-1 font-serif text-base font-semibold leading-tight">{a.titulo}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {a.procesoCodigo && <span>{a.procesoCodigo}</span>}
                  <span className="inline-flex items-center gap-1">
                    <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.aprobadorNombre ?? "Sin aprobador"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.diasEsperando === 0 ? "hoy" : `hace ${a.diasEsperando} día${a.diasEsperando !== 1 ? "s" : ""}`}
                  </span>
                  {a.vencida && (
                    <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Vencida
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setExito(null); setReasignando(a); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Reasignar
              </button>
            </div>
          </div>
        ))}
      </div>

      {reasignando && (
        <DialogoReasignar
          aprobacion={reasignando}
          usuarios={usuarios}
          onCerrar={() => setReasignando(null)}
          onExito={(msg) => {
            setReasignando(null);
            setExito(msg);
            router.refresh();
            setTimeout(() => setExito(null), 6000);
          }}
        />
      )}
    </div>
  );
}

function DialogoReasignar({
  aprobacion,
  usuarios,
  onCerrar,
  onExito,
}: {
  aprobacion: AprobacionAdmin;
  usuarios: UsuarioOpcion[];
  onCerrar: () => void;
  onExito: (msg: string) => void;
}) {
  const [nuevoId, setNuevoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Excluir al aprobador actual de la lista (no tiene sentido reasignar al mismo).
  const opciones = usuarios.filter((u) => u.id !== aprobacion.aprobadorId);

  function confirmar() {
    setError(null);
    if (!nuevoId) {
      setError("Elegí el nuevo aprobador.");
      return;
    }
    if (motivo.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await reasignarAprobador(aprobacion.aprobacionId, aprobacion.nivelPendiente, nuevoId, motivo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const nombre = usuarios.find((u) => u.id === nuevoId)?.nombre ?? "el nuevo aprobador";
      onExito(`Aprobación de ${aprobacion.codigo} reasignada a ${nombre}.`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserCog className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold">
              Reasignar aprobador (Nivel {aprobacion.nivelPendiente})
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {aprobacion.codigo} — actualmente en {aprobacion.aprobadorNombre ?? "sin aprobador"}.
              El cambio queda registrado en la auditoría.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="nuevo-aprobador" className="mb-1.5 block text-sm font-medium">
            Nuevo aprobador
          </label>
          <select
            id="nuevo-aprobador"
            value={nuevoId}
            onChange={(e) => setNuevoId(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Elegí un usuario…</option>
            {opciones.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="motivo-reasignar" className="mb-1.5 block text-sm font-medium">
            Motivo
          </label>
          <textarea
            id="motivo-reasignar"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={pending}
            placeholder="Por qué se reasigna esta aprobación…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reasignando…
              </>
            ) : (
              <>
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
