"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Send, TriangleAlert, Info } from "lucide-react";
import type { UsuarioElegible, SugerenciaAprobacion, NivelJerarquico } from "@/lib/api/envio";
import { enviarAAprobacion, type EstadoEnvio } from "@/app/(app)/documentos/[id]/enviar-aprobacion-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Props = {
  documentoId: string;
  versionId: string;
  numeroVersion: string;
  usuarios: UsuarioElegible[];
  sugerencia: SugerenciaAprobacion;
  abierto: boolean;
  onClose: () => void;
};

const NIVEL_LABEL: Record<NivelJerarquico, string> = {
  gerente: "gerente",
  jefatura: "jefatura",
  analista: "analista",
  operativo: "operativo",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="flex-1">
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Enviando…</>
      ) : (
        <><Send className="h-4 w-4" aria-hidden="true" />Enviar a aprobación</>
      )}
    </Button>
  );
}

// El único candidato de un nivel dado, o null si hay cero o más de uno.
function unicoDelNivel(usuarios: UsuarioElegible[], nivel: NivelJerarquico | null): string {
  if (!nivel) return "";
  const delNivel = usuarios.filter((u) => u.nivel === nivel);
  return delNivel.length === 1 ? delNivel[0].id : "";
}

export function EnviarAprobacionDialog({
  documentoId,
  versionId,
  numeroVersion,
  usuarios,
  sugerencia,
  abierto,
  onClose,
}: Props) {
  const router = useRouter();
  const accion = enviarAAprobacion.bind(null, documentoId);
  const [estado, formAction] = useFormState<EstadoEnvio, FormData>(accion, null);

  // ¿El tipo documental requiere segundo nivel de aprobación?
  const requiereN2 = sugerencia?.requiereN2 ?? true;

  // Precarga: si hay un único candidato del nivel sugerido, lo elige por defecto.
  const [n1, setN1] = useState(() => unicoDelNivel(usuarios, sugerencia?.nivelN1 ?? null));
  const [n2, setN2] = useState(() => requiereN2 ? unicoDelNivel(usuarios, sugerencia?.nivelN2 ?? null) : "");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (estado?.ok) { onClose(); router.refresh(); }
  }, [estado, onClose, router]);

  const nivelDe = useMemo(() => {
    const m = new Map<string, NivelJerarquico | null>();
    for (const u of usuarios) m.set(u.id, u.nivel);
    return m;
  }, [usuarios]);

  // Desvío: el aprobador elegido no cumple el nivel sugerido para ese puesto.
  const n1Desvia = Boolean(sugerencia?.nivelN1 && n1 && nivelDe.get(n1) !== sugerencia.nivelN1);
  const n2Desvia = Boolean(requiereN2 && sugerencia?.nivelN2 && n2 && nivelDe.get(n2) !== sugerencia.nivelN2);
  const hayDesvio = n1Desvia || n2Desvia;

  const opcionesN2 = usuarios.filter((u) => u.id !== n1);
  const opcionesN1 = usuarios.filter((u) => u.id !== n2);

  function etiqueta(u: UsuarioElegible): string {
    return u.nivel ? `${u.nombre} · ${NIVEL_LABEL[u.nivel]}` : `${u.nombre} · sin nivel`;
  }

  return (
    <ModalShell abierto={abierto} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader>
        <h2 id="envio-title" className="font-serif text-2xl font-semibold tracking-tight">Enviar a aprobación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Versión {numeroVersion}.{" "}
          {requiereN2
            ? "Elegí los dos aprobadores. Deben ser personas distintas y ninguno puede ser el elaborador del documento."
            : "Este tipo de documento se aprueba con un solo nivel. Elegí el aprobador; no puede ser el elaborador del documento."}
        </p>
      </ModalHeader>

      <form action={formAction} className={MODAL_FORM_CLASS}>
        <ModalBody className="space-y-5">
          <input type="hidden" name="versionId" value={versionId} />

          {/* Sugerencia por tipo documental */}
          {sugerencia && (sugerencia.nivelN1 || sugerencia.nivelN2) && (
            <div className="mt-4 flex gap-2.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Por ser <span className="font-medium">{sugerencia.tipoNombre}</span>, se recomienda{" "}
                {sugerencia.nivelN1 && <>nivel 1 de <span className="font-medium">{NIVEL_LABEL[sugerencia.nivelN1]}</span></>}
                {sugerencia.nivelN1 && sugerencia.nivelN2 && " y "}
                {sugerencia.nivelN2 && <>nivel 2 de <span className="font-medium">{NIVEL_LABEL[sugerencia.nivelN2]}</span></>}
                . Podés elegir otros, indicando el motivo.
              </p>
            </div>
          )}

          <div className="space-y-2">
              <label htmlFor="n1" className="text-sm font-medium">Aprobador de nivel 1</label>
              <select
                id="n1" name="aprobadorN1Id" value={n1} onChange={(e) => setN1(e.target.value)} required
                className={"w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring " + (n1Desvia ? "border-amber-400" : "border-input")}
              >
                <option value="" disabled>Elegí un aprobador…</option>
                {opcionesN1.map((u) => <option key={u.id} value={u.id}>{etiqueta(u)}</option>)}
              </select>
              {n1Desvia && sugerencia?.nivelN1 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  No es {NIVEL_LABEL[sugerencia.nivelN1]}, el nivel recomendado para nivel 1.
                </p>
              )}
            </div>

            {requiereN2 && (
            <div className="space-y-2">
              <label htmlFor="n2" className="text-sm font-medium">Aprobador de nivel 2</label>
              <select
                id="n2" name="aprobadorN2Id" value={n2} onChange={(e) => setN2(e.target.value)} required
                className={"w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring " + (n2Desvia ? "border-amber-400" : "border-input")}
              >
                <option value="" disabled>Elegí un aprobador…</option>
                {opcionesN2.map((u) => <option key={u.id} value={u.id}>{etiqueta(u)}</option>)}
              </select>
              {n2Desvia && sugerencia?.nivelN2 ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  No es {NIVEL_LABEL[sugerencia.nivelN2]}, el nivel recomendado para nivel 2.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">El nivel 2 decide después de que el nivel 1 apruebe.</p>
              )}
            </div>
            )}

            {/* Motivo de override: obligatorio si hay desvío */}
            {hayDesvio && (
              <div className="space-y-2">
                <label htmlFor="motivoOverride" className="text-sm font-medium">
                  Motivo del desvío <span className="text-amber-700">(obligatorio)</span>
                </label>
                <textarea
                  id="motivoOverride" name="motivoOverride" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Por qué se eligen aprobadores de otro nivel para este documento…"
                  className="w-full rounded-md border border-amber-300 bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">Queda registrado en la aprobación para auditoría.</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="plazo" className="text-sm font-medium">
                Plazo objetivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input id="plazo" name="plazoDias" type="number" min={1} max={90} placeholder="5"
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <span className="text-sm text-muted-foreground">días desde hoy</span>
              </div>
            </div>

            <div className="pb-1" />
        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <SubmitButton disabled={!n1 || (requiereN2 && !n2) || (hayDesvio && motivo.trim().length < 5)} />
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
