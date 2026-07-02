"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Loader2, CheckCircle2, Clock, ListChecks } from "lucide-react";
import type { Accion } from "@/lib/api/acciones";
import type { UsuarioElegible } from "@/lib/api/envio";
import { crearAccion, completarAccion, type EstadoAccion } from "@/app/(app)/ncs/[id]/accion-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Props = {
  ncId: string;
  acciones: Accion[];
  usuarios: UsuarioElegible[];
};

const TIPO_LABEL: Record<string, string> = {
  inmediata: "Inmediata", correctiva: "Correctiva", preventiva: "Preventiva", mejora: "Mejora",
};
const ESTADO_META: Record<string, { label: string; color: string }> = {
  planificada: { label: "Planificada", color: "#0284c7" },
  en_curso: { label: "En curso", color: "#d97706" },
  completada: { label: "Completada", color: "#059669" },
  cancelada: { label: "Cancelada", color: "#6b7280" },
  vencida: { label: "Vencida", color: "#dc2626" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Creando…</> : <><Plus className="h-4 w-4" />Agregar acción</>}
    </Button>
  );
}

export function GestionAcciones({ ncId, acciones, usuarios }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useFormState<EstadoAccion, FormData>(crearAccion, null);
  const [completando, setCompletando] = useState<string | null>(null);
  const [accionACompletar, setAccionACompletar] = useState<Accion | null>(null);
  const [resultado, setResultado] = useState("");
  const [errorCompletar, setErrorCompletar] = useState<string | null>(null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); router.refresh(); }
  }, [estado, router]);

  async function confirmarCompletar() {
    if (!accionACompletar) return;
    setErrorCompletar(null);
    if (resultado.trim().length < 3) {
      setErrorCompletar("Indicá el resultado obtenido (mínimo 3 caracteres).");
      return;
    }
    setCompletando(accionACompletar.id);
    const r = await completarAccion(ncId, accionACompletar.id, resultado);
    setCompletando(null);
    if (r?.ok) {
      setAccionACompletar(null);
      setResultado("");
      router.refresh();
    } else {
      setErrorCompletar(r?.ok === false ? r.error : "No se pudo completar la acción.");
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Acciones {acciones.length > 0 && `(${acciones.length})`}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />Agregar acción
        </Button>
      </div>

      {acciones.length > 0 ? (
        <div className="space-y-2">
          {acciones.map((a) => {
            const meta = ESTADO_META[a.estado] ?? ESTADO_META.planificada;
            const vencida = a.estado !== "completada" && new Date(a.fechaLimite) < new Date();
            return (
              <div key={a.id} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{a.codigo}</span>
                      <span className="text-xs text-muted-foreground">{TIPO_LABEL[a.tipo]}</span>
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                      {vencida && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
                    </div>
                    <h3 className="text-sm font-medium">{a.titulo}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.descripcion}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span>Responsable: {a.responsableNombre}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Límite {new Date(a.fechaLimite).toLocaleDateString("es-AR")}</span>
                    </div>
                  </div>
                  {a.estado !== "completada" && a.estado !== "cancelada" && (
                    <button
                      type="button"
                      onClick={() => { setAccionACompletar(a); setResultado(""); setErrorCompletar(null); }}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/50 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Completar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <ListChecks className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Sin acciones definidas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Definí las acciones correctivas, preventivas o inmediatas para tratar esta no conformidad.
          </p>
        </div>
      )}

      {accionACompletar && (
        <ModalShell abierto onClose={() => setAccionACompletar(null)} maxWidth="max-w-md">
          <ModalHeader>
            <h2 className="font-serif text-xl font-semibold tracking-tight">Completar acción</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {accionACompletar.codigo} · {accionACompletar.titulo}
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2 pb-3">
              <label htmlFor="resultado-obtenido" className="text-sm font-medium">
                Resultado obtenido
              </label>
              <textarea
                id="resultado-obtenido"
                rows={4}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder="Describí qué se hizo y qué resultado se obtuvo con esta acción…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={errorCompletar} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setAccionACompletar(null)} className="flex-1">
                Cancelar
              </Button>
              <Button type="button" onClick={confirmarCompletar} disabled={completando === accionACompletar.id} className="flex-1">
                {completando === accionACompletar.id ? <><Loader2 className="h-4 w-4 animate-spin" />Completando…</> : <><CheckCircle2 className="h-4 w-4" />Completar acción</>}
              </Button>
            </div>
          </ModalFooter>
        </ModalShell>
      )}

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-lg">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Agregar acción</h2>
        </ModalHeader>
        <form action={formAction} className={MODAL_FORM_CLASS}>
          <ModalBody className="space-y-5">
            <input type="hidden" name="noConformidadId" value={ncId} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
                    <select id="tipo" name="tipo" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="correctiva">Correctiva</option>
                      <option value="preventiva">Preventiva</option>
                      <option value="inmediata">Inmediata</option>
                      <option value="mejora">Mejora</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="prioridad" className="text-sm font-medium">Prioridad</label>
                    <select id="prioridad" name="prioridad" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="alta">Alta</option>
                      <option value="media" selected>Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="titulo" className="text-sm font-medium">Título</label>
                  <input id="titulo" name="titulo" required maxLength={200} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
                  <textarea id="descripcion" name="descripcion" rows={2} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="responsableId" className="text-sm font-medium">Responsable</label>
                    <select id="responsableId" name="responsableId" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Elegí…</option>
                      {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fechaLimite" className="text-sm font-medium">Fecha límite</label>
                    <input id="fechaLimite" name="fechaLimite" type="date" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
            <div className="pb-2" />
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
              <SubmitButton />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </section>
  );
}
