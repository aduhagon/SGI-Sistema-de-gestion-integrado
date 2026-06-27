"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectorRequisitoNC } from "@/components/ncs/SelectorRequisitoNC";
import type { NormaOpcionNC, RequisitoOpcionNC } from "@/components/ncs/SelectorRequisitoNC";
import { crearNCDesdeModal, type EstadoCrearNCModal } from "@/app/(app)/ncs/crear-nc-modal-actions";

type ProcOpcion = { id: string; codigo: string; nombre: string };
type HallazgoOpcion = { id: string; codigo: string; titulo: string; tipo: string };

type Props = {
  procesos: ProcOpcion[];
  hallazgos: HallazgoOpcion[];
  normas: NormaOpcionNC[];
  requisitosPorNorma: Record<string, RequisitoOpcionNC[]>;
  abierto: boolean;
  onClose: () => void;
};

const ORIGENES = [
  { value: "control_interno", label: "Control interno" },
  { value: "auditoria_interna", label: "Auditoría interna" },
  { value: "auditoria_externa", label: "Auditoría externa" },
  { value: "reclamo_cliente", label: "Reclamo de cliente" },
  { value: "proveedor", label: "Proveedor" },
  { value: "accidente", label: "Accidente" },
  { value: "otro", label: "Otro" },
];

const ORIGENES_AUDITORIA = ["auditoria_interna", "auditoria_externa"];
const PASOS = ["Qué", "Dónde", "Detalle"] as const;
const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Creando…</>
      ) : (
        <><Save className="h-4 w-4" aria-hidden="true" />Abrir no conformidad</>
      )}
    </Button>
  );
}

export function NCModalWizard({
  procesos,
  hallazgos,
  normas,
  requisitosPorNorma,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoCrearNCModal, FormData>(crearNCDesdeModal, null);

  const [paso, setPaso] = useState(0);
  const [origen, setOrigen] = useState("control_interno");
  const [accionInmediata, setAccionInmediata] = useState(false);
  // Obligatorios que validamos por paso.
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [requisitoId, setRequisitoId] = useState("");
  const [hallazgoId, setHallazgoId] = useState("");
  const [errorPaso, setErrorPaso] = useState<string | null>(null);

  const esAuditoria = ORIGENES_AUDITORIA.includes(origen);

  // Al crear con éxito: cerrar y navegar a la NC para arrancar su tratamiento.
  useEffect(() => {
    if (estado?.ok) {
      onClose();
      router.push(`/ncs/${estado.ncId}?creada=1`);
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

  useEffect(() => {
    if (abierto) {
      setPaso(0);
      setErrorPaso(null);
    }
  }, [abierto]);

  if (!abierto) return null;

  // El selector de requisito captura su valor en un <input name="requisitoId">
  // interno; acá mantenemos un espejo para poder validar el paso 2. Para eso
  // observamos el cambio vía un onChange en el contenedor (event delegation).
  function onPaso2Change(e: React.FormEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLSelectElement) {
      if (target.name === "requisitoId") setRequisitoId(target.value);
      if (target.name === "hallazgoId") setHallazgoId(target.value);
    }
  }

  function validarPaso(n: number): string | null {
    if (n === 0) {
      if (!titulo.trim()) return "El título es obligatorio.";
    }
    if (n === 1) {
      // Requisito incumplido es obligatorio (salvo que no haya normas cargadas).
      if (normas.length > 0 && !requisitoId) return "Elegí la norma y el requisito incumplido.";
      if (esAuditoria && !hallazgoId) {
        return hallazgos.length > 0
          ? "Las NC de origen auditoría deben vincularse a un hallazgo."
          : "No hay hallazgos de auditoría sin NC. Registrá el hallazgo primero o cambiá el origen.";
      }
    }
    if (n === 2) {
      if (!descripcion.trim()) return "La descripción es obligatoria.";
      if (accionInmediata) {
        const ta = document.querySelector<HTMLTextAreaElement>('textarea[name="accionInmediataDescripcion"]');
        if (!ta || !ta.value.trim()) return "Si requiere acción inmediata, describí cuál.";
      }
    }
    return null;
  }

  function avanzar() {
    const err = validarPaso(paso);
    if (err) { setErrorPaso(err); return; }
    setErrorPaso(null);
    setPaso((p) => Math.min(PASOS.length - 1, p + 1));
  }
  function retroceder() {
    setErrorPaso(null);
    setPaso((p) => Math.max(0, p - 1));
  }
  function onSubmitGuard(e: React.FormEvent<HTMLFormElement>) {
    for (let i = 0; i < PASOS.length; i++) {
      const err = validarPaso(i);
      if (err) { e.preventDefault(); setPaso(i); setErrorPaso(err); return; }
    }
  }

  const enUltimo = paso === PASOS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Abrir no conformidad</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrá el incumplimiento detectado. El código se genera automáticamente.
          </p>

          <div className="mt-5 flex items-center gap-1.5">
            {PASOS.map((nombre, i) => {
              const activo = i === paso;
              const completo = i < paso;
              return (
                <div key={nombre} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (i <= paso) { setErrorPaso(null); setPaso(i); }
                      else avanzar();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors " +
                        (activo
                          ? "bg-foreground text-background"
                          : completo
                            ? "bg-emerald-100 text-emerald-700"
                            : "border border-border bg-muted/40 text-muted-foreground")
                      }
                    >
                      {completo ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={"text-xs " + (activo ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {nombre}
                    </span>
                  </button>
                  {i < PASOS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <form action={formAction} onSubmit={onSubmitGuard} className="mt-6">
            {/* Paso 1 — Qué */}
            <div hidden={paso !== 0} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="titulo" className="text-sm font-medium">Título</label>
                <input
                  id="titulo" name="titulo" maxLength={200} value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Resumen de la no conformidad"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
                  <select id="tipo" name="tipo" className={INPUT_CLASS}>
                    <option value="no_conformidad">No conformidad</option>
                    <option value="desviacion">Desviación</option>
                    <option value="incidente">Incidente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="severidad" className="text-sm font-medium">Severidad</label>
                  <select id="severidad" name="severidad" defaultValue="media" className={INPUT_CLASS}>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="origen" className="text-sm font-medium">Origen</label>
                  <select
                    id="origen" name="origen" value={origen} onChange={(e) => setOrigen(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {ORIGENES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Paso 2 — Dónde */}
            <div hidden={paso !== 1} className="space-y-5" onChange={onPaso2Change}>
              <SelectorRequisitoNC normas={normas} requisitosPorNorma={requisitosPorNorma} />

              {esAuditoria && (
                <div className="space-y-2">
                  <label htmlFor="hallazgoId" className="text-sm font-medium">Hallazgo de origen</label>
                  {hallazgos.length > 0 ? (
                    <select id="hallazgoId" name="hallazgoId" className={INPUT_CLASS}>
                      <option value="">Elegí el hallazgo…</option>
                      {hallazgos.map((h) => (
                        <option key={h.id} value={h.id}>{h.codigo} — {h.titulo}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      No hay hallazgos de auditoría sin NC asociada. Registrá primero el hallazgo
                      en la auditoría correspondiente, o elegí otro origen.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Las NC de origen auditoría deben vincularse a un hallazgo registrado.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="procesoId" className="text-sm font-medium">
                  Proceso afectado <span className="text-muted-foreground">(opcional)</span>
                </label>
                <select id="procesoId" name="procesoId" className={INPUT_CLASS}>
                  <option value="">Sin proceso específico</option>
                  {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Paso 3 — Detalle */}
            <div hidden={paso !== 2} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
                <textarea
                  id="descripcion" name="descripcion" rows={3} value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="En qué consiste el incumplimiento detectado…"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="fechaLimiteCierre" className="text-sm font-medium">
                  Fecha límite de cierre <span className="text-muted-foreground">(opcional)</span>
                </label>
                <input id="fechaLimiteCierre" name="fechaLimiteCierre" type="date" className={INPUT_CLASS + " sm:w-56"} />
              </div>

              <div className="space-y-3 rounded-md border border-border p-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox" name="requiereAccionInmediata"
                    checked={accionInmediata} onChange={(e) => setAccionInmediata(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Requiere acción inmediata (contención)
                </label>
                {accionInmediata && (
                  <textarea
                    name="accionInmediataDescripcion" rows={2}
                    placeholder="Qué acción de contención se tomó o se tomará de inmediato…"
                    className={INPUT_CLASS}
                  />
                )}
              </div>
            </div>

            {errorPaso && (
              <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errorPaso}
              </div>
            )}
            {estado && !estado.ok && (
              <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {estado.error}
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              {paso > 0 ? (
                <Button type="button" variant="outline" onClick={retroceder}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />Atrás
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              )}
              <div className="flex-1" />
              {enUltimo ? (
                <SubmitButton />
              ) : (
                <Button type="button" onClick={avanzar}>
                  Siguiente<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
