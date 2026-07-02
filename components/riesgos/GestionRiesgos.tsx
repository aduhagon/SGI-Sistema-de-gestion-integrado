"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, Loader2, Save, ShieldAlert, TrendingUp, Search,
  Check, ArrowLeft, ArrowRight, Link2,
} from "lucide-react";
import type {
  Riesgo, ProcesoOpcion, PuestoOpcion,
  MitiganteRiesgo, DocumentoOpcion, IndicadorOpcion,
} from "@/lib/api/riesgos";
import { MitigantesEditor } from "@/components/riesgos/MitigantesEditor";
import {
  clasificarNivel, residual, type NivelRiesgo,
  GRADOS_CONTROL, GRADO_CONTROL_LABEL, factorControl, type GradoControl,
} from "@/lib/riesgos-utils";
import { guardarRiesgo, eliminarRiesgo, type EstadoRiesgo } from "@/app/(app)/riesgos/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

const NIVEL_COLOR: Record<NivelRiesgo, string> = {
  bajo: "bg-emerald-100 text-emerald-700",
  medio: "bg-amber-100 text-amber-700",
  alto: "bg-orange-100 text-orange-700",
  extremo: "bg-red-100 text-red-700",
};
const NIVEL_LABEL: Record<NivelRiesgo, string> = {
  bajo: "Bajo", medio: "Medio", alto: "Alto", extremo: "Extremo",
};
const ESTADOS = ["identificado", "en_tratamiento", "controlado", "materializado", "cerrado"];
const TRATAMIENTOS = ["evitar", "mitigar", "transferir", "aceptar", "explotar"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

const PASOS = ["Identificación", "Análisis", "Evaluación", "Tratamiento"] as const;
const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Factor de control en texto, para la línea de fórmula del residual.
const FACTOR_TXT: Record<Exclude<GradoControl, null>, string> = {
  control_total: "control total (×0,25)",
  control_parcial: "control parcial (×0,5)",
  sin_control: "sin control (×1)",
  desestimado_gerencia: "desestimado por gerencia (×1)",
};

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear riesgo"}</>}
    </Button>
  );
}

function celdaColor(nivel: NivelRiesgo): string {
  if (nivel === "bajo") return "bg-emerald-200";
  if (nivel === "medio") return "bg-amber-200";
  if (nivel === "alto") return "bg-orange-200";
  return "bg-red-300";
}

export function GestionRiesgos({ riesgos, procesos, puestos, mitigantesPorRiesgo, documentosOpc, indicadoresOpc }: {
  riesgos: Riesgo[];
  procesos: ProcesoOpcion[];
  puestos: PuestoOpcion[];
  mitigantesPorRiesgo: Record<string, MitiganteRiesgo[]>;
  documentosOpc: DocumentoOpcion[];
  indicadoresOpc: IndicadorOpcion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editando, setEditando] = useState<Riesgo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [prob, setProb] = useState(3);
  const [imp, setImp] = useState(3);
  const [gradoControl, setGradoControl] = useState<string>("");
  const [estado, formAction] = useFormState<EstadoRiesgo, FormData>(guardarRiesgo, null);

  // Estado del wizard
  const [paso, setPaso] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [procesoId, setProcesoId] = useState("");
  const [errorPaso, setErrorPaso] = useState<string | null>(null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrir(r: Riesgo | null) {
    setEditando(r);
    setProb(r ? r.probabilidad : 3);
    setImp(r ? r.impacto : 3);
    setGradoControl(r?.gradoControl ?? "");
    setTitulo(r?.titulo ?? "");
    setCodigo(r?.codigo ?? "");
    setProcesoId(r?.procesoId ?? "");
    setPaso(0);
    setErrorPaso(null);
    setAbierto(true);
  }

  // Apertura automática cuando se llega con ?riesgo=<id> (ej. desde la ficha del proceso).
  useEffect(() => {
    const riesgoId = searchParams.get("riesgo");
    if (!riesgoId) return;
    const r = riesgos.find((x) => x.id === riesgoId);
    if (r) {
      abrir(r);
      router.replace("/riesgos", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, riesgos, router]);

  async function quitar(id: string) {
    setEliminando(id);
    const r = await eliminarRiesgo(id);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return riesgos;
    return riesgos.filter((r) =>
      r.codigo.toLowerCase().includes(q) || r.titulo.toLowerCase().includes(q) || r.procesoNombre.toLowerCase().includes(q),
    );
  }, [filtro, riesgos]);

  const nivelActual = clasificarNivel(prob, imp);
  const gc = (gradoControl === "" ? null : gradoControl) as GradoControl;
  const resid = residual(prob, imp, gc);

  // Validación por paso. Los obligatorios (código, título, proceso) caen en el paso 1.
  function validarPaso(n: number): string | null {
    if (n === 0) {
      if (!codigo.trim()) return "El código es obligatorio.";
      if (!titulo.trim()) return "El título es obligatorio.";
      if (!procesoId) return "Elegí un proceso.";
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
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm sm:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por código, título o proceso…" className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nuevo riesgo</Button>
      </div>

      {filtrados.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Riesgo</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Proceso</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Nivel</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => {
                const nivel = clasificarNivel(r.probabilidad, r.impacto);
                const nMitigantes = mitigantesPorRiesgo[r.id]?.length ?? 0;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs align-top">{r.codigo}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {r.categoria === "oportunidad"
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          : <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="font-medium">{r.titulo}</span>
                      </div>
                      {nMitigantes > 0 && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Link2 className="h-3 w-3" aria-hidden="true" />
                          {nMitigantes} mitigante{nMitigantes !== 1 ? "s" : ""} vinculado{nMitigantes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">{r.procesoNombre}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${NIVEL_COLOR[nivel.nivel]}`}>
                        {NIVEL_LABEL[nivel.nivel]} ({nivel.numerico})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrir(r)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => quitar(r.id)} disabled={eliminando === r.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                          {eliminando === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : riesgos.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Ningún riesgo coincide con “{filtro}”.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ShieldAlert className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay riesgos registrados</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">Identificá los riesgos y oportunidades de cada proceso (ISO 9001 cláusula 6.1). Cada uno se evalúa por probabilidad e impacto.</p>
        </div>
      )}

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-2xl">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar riesgo" : "Nuevo riesgo"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">El nivel se calcula con probabilidad × impacto.</p>

          {/* Indicador de pasos (queda fijo, no scrollea) */}
          <div className="mt-5 flex items-center gap-1.5">
                {PASOS.map((nombre, i) => {
                  const activo = i === paso;
                  const completo = i < paso;
                  return (
                    <div key={nombre} className="flex flex-1 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { if (i <= paso) { setErrorPaso(null); setPaso(i); } else avanzar(); }}
                        className="flex items-center gap-1.5"
                      >
                        <span className={
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors " +
                          (activo ? "bg-foreground text-background" : completo ? "bg-emerald-100 text-emerald-700" : "border border-border bg-muted/40 text-muted-foreground")
                        }>
                          {completo ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={"hidden text-xs sm:inline " + (activo ? "font-medium text-foreground" : "text-muted-foreground")}>{nombre}</span>
                      </button>
                      {i < PASOS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
                    </div>
              );
            })}
          </div>
        </ModalHeader>

        <form action={formAction} onSubmit={onSubmitGuard} className={MODAL_FORM_CLASS}>
          <ModalBody className="pb-3">
            {editando && <input type="hidden" name="id" value={editando.id} />}

                {/* Paso 1 — Identificación */}
                <div hidden={paso !== 0} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                      <input id="codigo" name="codigo" required value={codigo} placeholder="R-COM-01"
                        onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                        className={INPUT + " font-mono"} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="categoria" className="text-sm font-medium">Categoría</label>
                      <select id="categoria" name="categoria" defaultValue={editando?.categoria ?? "riesgo"} className={INPUT}>
                        <option value="riesgo">Riesgo</option>
                        <option value="oportunidad">Oportunidad</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="titulo" className="text-sm font-medium">Título</label>
                    <input id="titulo" name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
                      <select id="procesoId" name="procesoId" required value={procesoId} onChange={(e) => setProcesoId(e.target.value)} className={INPUT}>
                        <option value="">Elegí un proceso…</option>
                        {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="responsableId" className="text-sm font-medium">Puesto responsable <span className="text-muted-foreground">(opc.)</span></label>
                      <select id="responsableId" name="responsableId" defaultValue={editando?.responsableId ?? ""} className={INPUT}>
                        <option value="">Sin asignar</option>
                        {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Paso 2 — Análisis */}
                <div hidden={paso !== 1} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Describí qué origina el riesgo y qué pasaría si se materializa.</p>
                  <div className="space-y-2">
                    <label htmlFor="causa" className="text-sm font-medium">Causa <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="causa" name="causa" rows={4} defaultValue={editando?.causa ?? ""} placeholder="¿Qué condiciones o factores lo originan?" className={INPUT} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="consecuencia" className="text-sm font-medium">Consecuencia <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="consecuencia" name="consecuencia" rows={4} defaultValue={editando?.consecuencia ?? ""} placeholder="¿Qué impacto tendría si se materializa?" className={INPUT} />
                  </div>
                </div>

                {/* Paso 3 — Evaluación y tratamiento */}
                <div hidden={paso !== 2} className="space-y-4">
                  <div className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Evaluación del riesgo</p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <label htmlFor="probabilidad" className="flex justify-between text-sm"><span>Probabilidad</span><span className="font-medium">{prob}</span></label>
                          <input id="probabilidad" name="probabilidad" type="range" min={1} max={5} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="w-full" />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="impacto" className="flex justify-between text-sm"><span>Impacto</span><span className="font-medium">{imp}</span></label>
                          <input id="impacto" name="impacto" type="range" min={1} max={5} value={imp} onChange={(e) => setImp(Number(e.target.value))} className="w-full" />
                        </div>
                      </div>
                      <div className="shrink-0 self-center sm:self-start">
                        <div className="grid grid-cols-5 gap-0.5">
                          {[5, 4, 3, 2, 1].map((iVal) =>
                            [1, 2, 3, 4, 5].map((pVal) => {
                              const cls = clasificarNivel(pVal, iVal);
                              const activa = pVal === prob && iVal === imp;
                              return (
                                <div key={`${pVal}-${iVal}`}
                                  className={`flex h-7 w-7 items-center justify-center rounded-sm text-[10px] ${celdaColor(cls.nivel)} ${activa ? "ring-2 ring-foreground ring-offset-1" : "opacity-70"}`}
                                  title={`P${pVal} × I${iVal} = ${cls.numerico}`}>
                                  {pVal * iVal}
                                </div>
                              );
                            }),
                          )}
                        </div>
                        <p className="mt-1 text-center text-[10px] text-muted-foreground">Probabilidad → / Impacto ↑</p>
                      </div>
                    </div>

                    {/* Grado de control */}
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <label htmlFor="gradoControl" className="text-sm font-medium">Grado de control <span className="text-muted-foreground">(opc.)</span></label>
                      <select id="gradoControl" name="gradoControl" value={gradoControl} onChange={(e) => setGradoControl(e.target.value)} className={INPUT}>
                        <option value="">Sin evaluar</option>
                        {GRADOS_CONTROL.map((g) => <option key={g} value={g}>{GRADO_CONTROL_LABEL[g]}</option>)}
                      </select>
                    </div>

                    {/* Justificación del grado de control */}
                    <div className="mt-4 space-y-2">
                      <label htmlFor="justificacionControl" className="text-sm font-medium">Justificación del control <span className="text-muted-foreground">(opc.)</span></label>
                      <textarea id="justificacionControl" name="justificacionControl" rows={3} maxLength={2000}
                        defaultValue={editando?.justificacionControl ?? ""}
                        placeholder="Explicá por qué se asignó este grado de control: metodología, evidencia, monitoreos existentes…"
                        className={INPUT} />
                      <p className="text-[11px] text-muted-foreground">Deja registro de por qué el control se valoró así (útil para auditoría).</p>
                    </div>

                    {/* Estado del ciclo de vida */}
                    <div className="mt-4 space-y-2">
                      <label htmlFor="estado" className="text-sm font-medium">Estado</label>
                      <select id="estado" name="estado" defaultValue={editando?.estado ?? "identificado"} className={INPUT}>
                        {ESTADOS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                      </select>
                    </div>

                    {/* Inherente → Residual en vivo */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div className="flex-1 rounded-md border border-border bg-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nivel inherente</p>
                        <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${NIVEL_COLOR[nivelActual.nivel]}`}>
                          {NIVEL_LABEL[nivelActual.nivel]} ({nivelActual.numerico})
                        </span>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">probabilidad × impacto</p>
                      </div>
                      <div className="hidden items-center justify-center text-muted-foreground sm:flex">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1 rounded-md border border-border bg-card p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nivel residual</p>
                        {gc === null ? (
                          <>
                            <span className="mt-1 inline-flex items-center text-xs text-muted-foreground">— sin evaluar —</span>
                            <p className="mt-1.5 text-[11px] text-muted-foreground">Elegí un grado de control para calcularlo.</p>
                          </>
                        ) : (
                          <>
                            <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${NIVEL_COLOR[resid.nivel]}`}>
                              {NIVEL_LABEL[resid.nivel]} ({resid.numerico})
                            </span>
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {nivelActual.numerico} × {factorControl(gc).toString().replace(".", ",")} = <span className="font-medium text-foreground">{resid.numerico}</span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Explicación de la fórmula */}
                    <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                      El <span className="font-medium text-foreground">nivel inherente</span> es el riesgo en bruto (probabilidad × impacto). El{" "}
                      <span className="font-medium text-foreground">residual</span> lo multiplica por el factor del grado de control
                      {gc ? <> — {FACTOR_TXT[gc as Exclude<GradoControl, null>]}</> : null}{" "}
                      y se reclasifica con los mismos cortes (bajo ≤4, medio 5–9, alto 10–15, extremo ≥16). “Sin control” y “desestimado por gerencia” no reducen el número; este último marca un riesgo aceptado conscientemente. Sin grado de control, el riesgo queda sin clasificar (gris en la vista por proceso).
                    </p>
                  </div>
                </div>

                {/* Paso 4 — Tratamiento */}
                <div hidden={paso !== 3} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Definí cómo se va a abordar el riesgo y cuándo se revisa.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="tipoTratamiento" className="text-sm font-medium">Tratamiento <span className="text-muted-foreground">(opc.)</span></label>
                      <select id="tipoTratamiento" name="tipoTratamiento" defaultValue={editando?.tipoTratamiento ?? ""} className={INPUT}>
                        <option value="">Sin definir</option>
                        {TRATAMIENTOS.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="fechaRevision" className="text-sm font-medium">Próxima revisión <span className="text-muted-foreground">(opc.)</span></label>
                      <input id="fechaRevision" name="fechaRevision" type="date" defaultValue={editando?.fechaRevision ?? ""} className={INPUT} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tratamientoPlanificado" className="text-sm font-medium">Plan de tratamiento / Mitigante <span className="text-muted-foreground">(opc.)</span></label>
                    <textarea id="tratamientoPlanificado" name="tratamientoPlanificado" rows={5} defaultValue={editando?.tratamientoPlanificado ?? ""} placeholder="Acciones para abordar este riesgo…" className={INPUT} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Controles / Mitigantes vinculados <span className="text-muted-foreground">(opc.)</span></label>
                    <MitigantesEditor
                      key={editando?.id ?? "nuevo"}
                      inicial={editando ? (mitigantesPorRiesgo[editando.id] ?? []) : []}
                      documentos={documentosOpc}
                      indicadores={indicadoresOpc}
                    />
                  </div>
                </div>

          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={errorPaso} />
            <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
            <div className="flex items-center gap-3">
              {paso > 0 ? (
                <Button type="button" variant="outline" onClick={retroceder}><ArrowLeft className="h-4 w-4" />Atrás</Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              )}
              <div className="flex-1" />
              {enUltimo ? (
                <SubmitButton edicion={!!editando} />
              ) : (
                <Button type="button" onClick={avanzar}>Siguiente<ArrowRight className="h-4 w-4" /></Button>
              )}
            </div>
          </ModalFooter>
        </form>
      </ModalShell>
    </div>
  );
}
