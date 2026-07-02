"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ListChecks, Plus, Loader2, Trash2, Check, X, MinusCircle, Circle, BookOpen,
} from "lucide-react";
import type { ItemChecklist } from "@/lib/api/auditoria-checklist";
import {
  agregarItemChecklist, quitarItemChecklist, completarItemChecklist,
  type EstadoChecklist,
} from "@/app/(app)/auditorias/[id]/checklist-actions";
import { Button } from "@/components/ui/button";
import {
  ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS,
} from "@/components/ui/modal";

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ReqOpcion = { id: string; clausula: string; titulo: string; norma: string };

const RESULTADO_META: Record<string, { label: string; color: string; icon: typeof Check }> = {
  pendiente: { label: "Pendiente", color: "#6b7280", icon: Circle },
  conforme: { label: "Conforme", color: "#059669", icon: Check },
  no_conforme: { label: "No conforme", color: "#dc2626", icon: X },
  no_aplica: { label: "No aplica", color: "#9ca3af", icon: MinusCircle },
};

type Props = {
  auditoriaId: string;
  items: ItemChecklist[];
  requisitos: ReqOpcion[];
  estadoAuditoria: string;
  esLiderOSgi: boolean;
  esMiembroEquipo: boolean;
};

function SubmitAgregar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Agregando…</> : <><Plus className="h-4 w-4" />Agregar ítem</>}
    </Button>
  );
}

function SubmitCompletar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Check className="h-4 w-4" />Guardar resultado</>}
    </Button>
  );
}

export function SeccionChecklist({
  auditoriaId, items, requisitos, estadoAuditoria, esLiderOSgi, esMiembroEquipo,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [completando, setCompletando] = useState<ItemChecklist | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  const [estadoAgregar, accionAgregar] = useFormState<EstadoChecklist, FormData>(agregarItemChecklist, null);
  const [estadoCompletar, accionCompletar] = useFormState<EstadoChecklist, FormData>(completarItemChecklist, null);

  useEffect(() => { if (estadoAgregar?.ok) { setAbierto(false); router.refresh(); } }, [estadoAgregar, router]);
  useEffect(() => { if (estadoCompletar?.ok) { setCompletando(null); router.refresh(); } }, [estadoCompletar, router]);

  async function quitar(id: string) {
    setQuitando(id);
    const r = await quitarItemChecklist(auditoriaId, id);
    setQuitando(null);
    if (r?.ok) router.refresh();
  }

  // Definición del plan: el líder arma el checklist en planificación.
  const puedeDefinir = esLiderOSgi && estadoAuditoria === "planificada";
  // Ejecución: el equipo completa resultados con la auditoría en curso.
  const puedeCompletar = esMiembroEquipo && estadoAuditoria === "en_curso";

  const completados = items.filter((i) => i.resultado !== "pendiente").length;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Checklist de trabajo
          {items.length > 0 && (
            <span className="font-sans normal-case tracking-normal text-muted-foreground">
              · {completados}/{items.length} completado{items.length === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        {puedeDefinir && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Agregar ítem
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((it) => {
            const meta = RESULTADO_META[it.resultado] ?? RESULTADO_META.pendiente;
            const Icon = meta.icon;
            return (
              <div key={it.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    title={meta.label}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{it.descripcion}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {it.requisitoClausula && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" aria-hidden="true" />
                          {it.requisitoNorma ? `${it.requisitoNorma} · ` : ""}Requisito {it.requisitoClausula}
                        </span>
                      )}
                      <span style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    {it.comentario && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Comentario: </span>{it.comentario}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {puedeCompletar && (
                      <Button size="sm" variant="outline" onClick={() => setCompletando(it)}>
                        {it.resultado === "pendiente" ? "Completar" : "Editar"}
                      </Button>
                    )}
                    {puedeDefinir && (
                      <button
                        type="button" onClick={() => quitar(it.id)} disabled={quitando === it.id}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Quitar" aria-label="Quitar"
                      >
                        {quitando === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {puedeDefinir
            ? "Sin ítems. Definí los puntos de verificación que el equipo va a recorrer durante la auditoría."
            : "El líder todavía no definió el checklist de trabajo."}
        </p>
      )}

      {/* Modal: agregar ítem (planificación) */}
      <ModalShell abierto={abierto} onClose={() => setAbierto(false)}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">Agregar ítem al checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Qué se va a verificar. Opcionalmente, vinculá el requisito de norma correspondiente.
          </p>
        </ModalHeader>
        <form action={accionAgregar} className={MODAL_FORM_CLASS}>
          <input type="hidden" name="auditoriaId" value={auditoriaId} />
          <ModalBody>
            <div className="mb-3">
              <label htmlFor="descripcion" className="mb-1 block text-sm font-medium">Punto a verificar</label>
              <textarea id="descripcion" name="descripcion" rows={3} className={INPUT_CLASS}
                placeholder="Ej.: Verificar registros de control de temperatura en cámara de frío." />
            </div>
            <div className="mb-3">
              <label htmlFor="requisitoId" className="mb-1 block text-sm font-medium">Requisito (opcional)</label>
              <select id="requisitoId" name="requisitoId" className={INPUT_CLASS}>
                <option value="">Sin requisito específico</option>
                {requisitos.map((r) => (
                  <option key={r.id} value={r.id}>{r.norma} · {r.clausula} — {r.titulo}</option>
                ))}
              </select>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estadoAgregar && !estadoAgregar.ok ? estadoAgregar.error : null} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAbierto(false)}>Cancelar</Button>
              <SubmitAgregar />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>

      {/* Modal: completar resultado (ejecución) */}
      <ModalShell abierto={completando !== null} onClose={() => setCompletando(null)}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">Resultado de la verificación</h2>
          {completando && <p className="mt-1 text-sm text-muted-foreground">{completando.descripcion}</p>}
        </ModalHeader>
        <form action={accionCompletar} className={MODAL_FORM_CLASS}>
          <input type="hidden" name="auditoriaId" value={auditoriaId} />
          <input type="hidden" name="itemId" value={completando?.id ?? ""} />
          <ModalBody>
            <div className="mb-3">
              <label htmlFor="resultado" className="mb-1 block text-sm font-medium">Resultado</label>
              <select id="resultado" name="resultado" className={INPUT_CLASS} defaultValue={completando?.resultado ?? "conforme"} required>
                <option value="conforme">Conforme</option>
                <option value="no_conforme">No conforme</option>
                <option value="no_aplica">No aplica</option>
                <option value="pendiente">Pendiente (revertir)</option>
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="comentario" className="mb-1 block text-sm font-medium">Comentario / evidencia</label>
              <textarea id="comentario" name="comentario" rows={3} className={INPUT_CLASS}
                defaultValue={completando?.comentario ?? ""}
                placeholder="Observaciones, evidencia relevada, referencia al hallazgo si corresponde…" />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estadoCompletar && !estadoCompletar.ok ? estadoCompletar.error : null} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCompletando(null)}>Cancelar</Button>
              <SubmitCompletar />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </section>
  );
}
