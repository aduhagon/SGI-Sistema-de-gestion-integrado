"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, FileCheck2, CheckCircle2, Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS,
} from "@/components/ui/modal";
import {
  iniciarAuditoria, emitirInforme, devolverInforme, aprobarCierre,
} from "@/app/(app)/auditorias/[id]/flujo-actions";

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  auditoriaId: string;
  estado: string;
  esLider: boolean;
  esMiembroEquipo: boolean;
  esSgiOAdmin: boolean;
  checklistPendientes: number;
  emitidoPorMi: boolean;
};

export function BarraFlujoAuditoria({
  auditoriaId, estado, esLider, esMiembroEquipo, esSgiOAdmin,
  checklistPendientes, emitidoPorMi,
}: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "devolver" | "aprobar">(null);
  const [texto, setTexto] = useState("");

  const puedeEjecutar = esMiembroEquipo || esSgiOAdmin;
  const puedeRevisar = esLider || esSgiOAdmin;

  async function correr(accion: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setCargando(accion);
    setError(null);
    const r = await fn();
    setCargando(null);
    if (!r.ok) {
      setError(r.error ?? "No se pudo completar la acción.");
      return false;
    }
    setModal(null);
    setTexto("");
    router.refresh();
    return true;
  }

  // Nada que mostrar en estados terminales o sin permisos aplicables.
  const hayAlgo =
    (estado === "planificada" && puedeEjecutar) ||
    (estado === "en_curso" && puedeEjecutar) ||
    (estado === "informe_emitido" && (puedeRevisar || puedeEjecutar));
  if (!hayAlgo) return null;

  return (
    <div className="mb-8 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {estado === "planificada" && puedeEjecutar && (
          <Button
            size="sm"
            disabled={cargando !== null}
            onClick={() => correr("iniciar", () => iniciarAuditoria(auditoriaId))}
          >
            {cargando === "iniciar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Iniciar auditoría
          </Button>
        )}

        {estado === "en_curso" && puedeEjecutar && (
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              disabled={cargando !== null}
              onClick={() => correr("emitir", () => emitirInforme(auditoriaId))}
            >
              {cargando === "emitir" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
              Emitir informe
            </Button>
            {checklistPendientes > 0 && (
              <span className="text-xs text-amber-600">
                {checklistPendientes} ítem(s) del checklist sin completar.
              </span>
            )}
          </div>
        )}

        {estado === "informe_emitido" && puedeRevisar && (
          <>
            <Button size="sm" disabled={cargando !== null} onClick={() => { setError(null); setModal("aprobar"); }}>
              <CheckCircle2 className="h-4 w-4" />
              Aprobar cierre
            </Button>
            <Button size="sm" variant="outline" disabled={cargando !== null} onClick={() => { setError(null); setModal("devolver"); }}>
              <Undo2 className="h-4 w-4" />
              Devolver al equipo
            </Button>
            {emitidoPorMi && (
              <span className="text-xs text-muted-foreground">
                Emitiste vos el informe: el cierre lo aprueba otro líder (segregación de funciones).
              </span>
            )}
          </>
        )}
      </div>

      {error && !modal && (
        <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ModalShell abierto={modal === "aprobar"} onClose={() => setModal(null)}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">Aprobar cierre de la auditoría</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Redactá las conclusiones. Al aprobar, la auditoría queda cerrada y los resultados
            se hacen visibles para los responsables de proceso.
          </p>
        </ModalHeader>
        <div className={MODAL_FORM_CLASS}>
          <ModalBody>
            <label htmlFor="conclusiones" className="mb-1 block text-sm font-medium">Conclusiones</label>
            <textarea
              id="conclusiones" rows={5} className={INPUT_CLASS}
              value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="Síntesis de resultados, cumplimiento general, observaciones destacadas…"
            />
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={error} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button>
              <Button
                type="button" className="flex-1" disabled={cargando !== null}
                onClick={() => correr("aprobar", () => aprobarCierre(auditoriaId, texto))}
              >
                {cargando === "aprobar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprobar y cerrar
              </Button>
            </div>
          </ModalFooter>
        </div>
      </ModalShell>

      <ModalShell abierto={modal === "devolver"} onClose={() => setModal(null)}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">Devolver el informe al equipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La auditoría vuelve a “en curso” para que el equipo corrija. Indicá el motivo.
          </p>
        </ModalHeader>
        <div className={MODAL_FORM_CLASS}>
          <ModalBody>
            <label htmlFor="motivo" className="mb-1 block text-sm font-medium">Motivo de la devolución</label>
            <textarea
              id="motivo" rows={4} className={INPUT_CLASS}
              value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="Qué falta corregir o ampliar antes de aprobar el cierre…"
            />
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={error} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button>
              <Button
                type="button" className="flex-1" disabled={cargando !== null}
                onClick={() => correr("devolver", () => devolverInforme(auditoriaId, texto))}
              >
                {cargando === "devolver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                Devolver
              </Button>
            </div>
          </ModalFooter>
        </div>
      </ModalShell>
    </div>
  );
}
