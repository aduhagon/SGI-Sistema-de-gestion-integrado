"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { crearHallazgo, type EstadoHallazgo } from "@/app/(app)/auditorias/[id]/hallazgo-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

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

const PASOS = ["Qué", "Dónde", "Detalle"] as const;

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
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
  const [paso, setPaso] = useState(0);
  // Estado de los obligatorios, para validar por paso sin desmontar nada.
  const [titulo, setTitulo] = useState("");
  const [severidad, setSeveridad] = useState("alta");
  const [descripcion, setDescripcion] = useState("");
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const esNC = TIPOS_NC.includes(tipo);

  useEffect(() => {
    if (estado?.ok) {
      onClose();
      router.refresh();
    }
  }, [estado, onClose, router]);

  // Reset al abrir, para no arrastrar estado de una carga anterior.
  useEffect(() => {
    if (abierto) {
      setPaso(0);
      setErrorPaso(null);
    }
  }, [abierto]);

  // Validación del paso actual. Devuelve mensaje de error o null si está OK.
  function validarPaso(n: number): string | null {
    if (n === 0) {
      if (!titulo.trim()) return "El título es obligatorio.";
      if (esNC && !severidad) return "Elegí la severidad.";
    }
    if (n === 2) {
      if (!descripcion.trim()) return "La descripción es obligatoria.";
    }
    return null;
  }

  function avanzar() {
    const err = validarPaso(paso);
    if (err) {
      setErrorPaso(err);
      return;
    }
    setErrorPaso(null);
    setPaso((p) => Math.min(PASOS.length - 1, p + 1));
  }

  function retroceder() {
    setErrorPaso(null);
    setPaso((p) => Math.max(0, p - 1));
  }

  // Antes de enviar, validar todos los pasos; si algo falta, saltar a ese paso.
  function onSubmitGuard(e: React.FormEvent<HTMLFormElement>) {
    for (let i = 0; i < PASOS.length; i++) {
      const err = validarPaso(i);
      if (err) {
        e.preventDefault();
        setPaso(i);
        setErrorPaso(err);
        return;
      }
    }
  }

  const enUltimo = paso === PASOS.length - 1;

  return (
    <ModalShell abierto={abierto} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Registrar hallazgo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentá lo encontrado durante la auditoría. El código se genera automáticamente.
        </p>

        {/* Indicador de pasos (queda fijo, no scrollea) */}
        <div className="mt-5 flex items-center gap-1.5">
            {PASOS.map((nombre, i) => {
              const activo = i === paso;
              const completo = i < paso;
              return (
                <div key={nombre} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      // Permitir volver a pasos previos sin validar; avanzar solo valida.
                      if (i <= paso) {
                        setErrorPaso(null);
                        setPaso(i);
                      } else {
                        avanzar();
                      }
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
      </ModalHeader>

      <form ref={formRef} action={formAction} onSubmit={onSubmitGuard} className={MODAL_FORM_CLASS}>
        <ModalBody className="pb-3">
          <input type="hidden" name="auditoriaId" value={auditoriaId} />

            {/* Los tres pasos quedan montados; se ocultan con `hidden` para no
                perder lo cargado al navegar. */}

            {/* Paso 1 — Qué */}
            <div hidden={paso !== 0} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
                <select
                  id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {esNC && (
                <div className="space-y-2">
                  <label htmlFor="severidad" className="text-sm font-medium">Severidad</label>
                  <select
                    id="severidad" name="severidad" value={severidad}
                    onChange={(e) => setSeveridad(e.target.value)}
                    className={INPUT_CLASS}
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
                  id="titulo" name="titulo" maxLength={200} value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Resumen breve del hallazgo"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Paso 2 — Dónde */}
            <div hidden={paso !== 1} className="space-y-5">
              {requisitos.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="requisitoId" className="text-sm font-medium">
                    Requisito relacionado <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <select id="requisitoId" name="requisitoId" className={INPUT_CLASS}>
                    <option value="">Sin requisito específico</option>
                    {requisitos.map((r) => (
                      <option key={r.id} value={r.id}>{r.norma} {r.clausula} — {r.titulo}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta auditoría no tiene requisitos vinculados para asociar.
                </p>
              )}

              {procesos.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="procesoId" className="text-sm font-medium">
                    Proceso relacionado <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <select id="procesoId" name="procesoId" className={INPUT_CLASS}>
                    <option value="">Sin proceso específico</option>
                    {procesos.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta auditoría no tiene procesos vinculados para asociar.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Ambos campos son opcionales: ayudan a ubicar el hallazgo en la norma y el proceso.
              </p>
            </div>

            {/* Paso 3 — Detalle */}
            <div hidden={paso !== 2} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="descripcion" className="text-sm font-medium">Descripción</label>
                <textarea
                  id="descripcion" name="descripcion" rows={3} value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Qué se encontró, en qué consiste el hallazgo…"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="evidencia" className="text-sm font-medium">
                  Evidencia <span className="text-muted-foreground">(opcional)</span>
                </label>
                <textarea
                  id="evidencia" name="evidencia" rows={2}
                  placeholder="Documentos revisados, registros, entrevistas…"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={errorPaso} />
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex items-center gap-3">
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
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
