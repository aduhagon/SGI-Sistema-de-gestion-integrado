"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { crearHallazgo, type EstadoHallazgo } from "@/app/(app)/auditorias/[id]/hallazgo-actions";
import { Button } from "@/components/ui/button";

type ReqOpcion = { id: string; clausula: string; titulo: string; norma: string };
type ProcOpcion = { id: string; codigo: string; nombre: string };

type Props = {
  auditoriaId: string;
  requisitos: ReqOpcion[];
  procesos: ProcOpcion[];
  abierto: boolean;
  onClose: () => void;
};

const TIPOS = [
  { value: "no_conformidad_mayor", label: "No conformidad mayor" },
  { value: "no_conformidad_menor", label: "No conformidad menor" },
  { value: "observacion", label: "Observación" },
  { value: "oportunidad_mejora", label: "Oportunidad de mejora" },
  { value: "fortaleza", label: "Fortaleza" },
];

const TIPOS_NC = ["no_conformidad_mayor", "no_conformidad_menor"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Registrando…</>
      ) : (
        <><Plus className="h-4 w-4" aria-hidden="true" />Registrar hallazgo</>
      )}
    </Button>
  );
}

export function AgregarHallazgoDialog({
  auditoriaId,
  requisitos,
  procesos,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoHallazgo, FormData>(crearHallazgo, null);
  const [tipo, setTipo] = useState("observacion");

  useEffect(() => {
    if (estado?.ok) {
      onClose();
      router.refresh();
    }
  }, [estado, onClose, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (abierto) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [abierto, onClose]);

  if (!abierto) return null;

  const esNC = TIPOS_NC.includes(tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Registrar hallazgo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentá lo encontrado durante la auditoría. El código se genera automáticamente.
          </p>

          <form action={formAction} className="mt-6 space-y-5">
            <input type="hidden" name="auditoriaId" value={auditoriaId} />

            <div className="space-y-2">
              <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
              <select
                id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {esNC && (
              <div className="space-y-2">
                <label htmlFor="severidad" className="text-sm font-medium">Severidad</label>
                <select
                  id="severidad" name="severidad" required={esNC}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="titulo" className="text-sm font-medium">Título</label>
              <input
                id="titulo" name="titulo" required maxLength={200}
                placeholder="Resumen breve del hallazgo"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
              <textarea
                id="descripcion" name="descripcion" rows={3} required
                placeholder="Qué se encontró, en qué consiste el hallazgo…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="evidencia" className="text-sm font-medium">
                Evidencia <span className="text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="evidencia" name="evidencia" rows={2}
                placeholder="Documentos revisados, registros, entrevistas…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {requisitos.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="requisitoId" className="text-sm font-medium">
                  Requisito relacionado <span className="text-muted-foreground">(opcional)</span>
                </label>
                <select
                  id="requisitoId" name="requisitoId"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sin requisito específico</option>
                  {requisitos.map((r) => (
                    <option key={r.id} value={r.id}>{r.norma} {r.clausula} — {r.titulo}</option>
                  ))}
                </select>
              </div>
            )}

            {procesos.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="procesoId" className="text-sm font-medium">
                  Proceso relacionado <span className="text-muted-foreground">(opcional)</span>
                </label>
                <select
                  id="procesoId" name="procesoId"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sin proceso específico</option>
                  {procesos.map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {estado && !estado.ok && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {estado.error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
