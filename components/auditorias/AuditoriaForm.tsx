"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Save, Check, ArrowLeft, ArrowRight } from "lucide-react";
import type { NormaParaAlcance, ProcesoParaAlcance } from "@/lib/api/auditorias";
import { crearAuditoria, type EstadoCrearAuditoria } from "@/app/(app)/auditorias/nueva/actions";
import { Button } from "@/components/ui/button";

type Props = {
  normas: NormaParaAlcance[];
  procesos: ProcesoParaAlcance[];
};

const TIPOS = [
  { value: "interna", label: "Interna" },
  { value: "externa", label: "Externa" },
  { value: "certificacion", label: "Certificación" },
  { value: "vigilancia", label: "Vigilancia" },
  { value: "recertificacion", label: "Recertificación" },
];

const TIPOS_EXTERNOS = ["externa", "certificacion", "vigilancia", "recertificacion"];

const BANDA: Record<string, string> = {
  estrategico: "Estratégicos",
  operativo: "Operativos",
  apoyo: "Apoyo",
};

const PASOS = ["Básicos", "Normas", "Procesos"] as const;
const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Creando…</>
      ) : (
        <><Save className="h-4 w-4" aria-hidden="true" />Crear auditoría</>
      )}
    </Button>
  );
}

export function AuditoriaForm({ normas, procesos }: Props) {
  const [estado, formAction] = useFormState<EstadoCrearAuditoria, FormData>(crearAuditoria, null);
  const [tipo, setTipo] = useState("interna");

  const [paso, setPaso] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [normasSel, setNormasSel] = useState<Set<string>>(new Set());
  const [procesosSel, setProcesosSel] = useState<Set<string>>(new Set());
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [entidad, setEntidad] = useState("");
  const [hayCambios, setHayCambios] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const esExterna = TIPOS_EXTERNOS.includes(tipo);

  const procesosPorBanda = procesos.reduce<Record<string, ProcesoParaAlcance[]>>((acc, p) => {
    (acc[p.tipo] ??= []).push(p);
    return acc;
  }, {});

  const totalAlcance = normasSel.size + procesosSel.size;

  useEffect(() => {
    if (!hayCambios || enviando) return;
    const advertir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", advertir);
    return () => window.removeEventListener("beforeunload", advertir);
  }, [hayCambios, enviando]);

  useEffect(() => {
    if (estado && !estado.ok) { setEnviando(false); setHayCambios(true); }
  }, [estado]);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }

  function validarPaso(n: number): string | null {
    if (n === 0) {
      if (!titulo.trim()) return "El título es obligatorio.";
      if (!fecha) return "La fecha planificada es obligatoria.";
      if (esExterna && !entidad.trim()) return "La entidad certificadora es obligatoria para este tipo de auditoría.";
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
    if (totalAlcance === 0) {
      e.preventDefault();
      setPaso(1);
      setErrorPaso("Marcá al menos una norma o un proceso.");
      return;
    }
    setHayCambios(false);
    setEnviando(true);
  }
  const enUltimo = paso === PASOS.length - 1;

  return (
    <div>
      <div className="mb-6 flex items-center gap-1.5">
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

      <form action={formAction} onSubmit={onSubmitGuard} onChange={() => setHayCambios(true)}>
        <div hidden={paso !== 0} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="titulo" className="text-sm font-medium">Título <span className="text-destructive">*</span></label>
            <input
              id="titulo" name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Auditoría interna anual del SGI 2026" className={INPUT}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
              <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={INPUT}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="fechaPlanificada" className="text-sm font-medium">Fecha planificada <span className="text-destructive">*</span></label>
              <input
                id="fechaPlanificada" name="fechaPlanificada" type="date" required
                value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT}
              />
            </div>
          </div>

          {esExterna && (
            <div className="space-y-2">
              <label htmlFor="entidadCertificadora" className="text-sm font-medium">Entidad certificadora <span className="text-destructive">*</span></label>
              <input id="entidadCertificadora" name="entidadCertificadora" value={entidad} onChange={(e) => setEntidad(e.target.value)} required placeholder="Ej: Bureau Veritas, SGS, TÜV…" className={INPUT} />
              <p className="text-xs text-muted-foreground">
                Obligatoria para auditorías externas, de certificación, vigilancia o recertificación.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="objetivo" className="text-sm font-medium">
              Objetivo <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea id="objetivo" name="objetivo" rows={3} placeholder="Qué se busca verificar con esta auditoría…" className={INPUT} />
          </div>
        </div>

        <div hidden={paso !== 1} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Qué normas se auditan. Marcá al menos una norma o un proceso (en el paso siguiente).
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {normas.map((n) => (
              <label
                key={n.versionNormaId}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="checkbox" name="normasIds" value={n.versionNormaId} className="h-4 w-4"
                  checked={normasSel.has(n.versionNormaId)}
                  onChange={() => toggle(normasSel, setNormasSel, n.versionNormaId)}
                />
                <span>
                  <span className="font-mono text-xs">{n.codigo}</span> · {n.nombreCorto}{" "}
                  <span className="text-muted-foreground">{n.version}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {normasSel.size} norma{normasSel.size !== 1 ? "s" : ""} seleccionada{normasSel.size !== 1 ? "s" : ""}.
          </p>
        </div>

        <div hidden={paso !== 2} className="space-y-3">
          <p className="text-sm text-muted-foreground">Qué procesos entran en la auditoría.</p>
          {Object.entries(procesosPorBanda).map(([banda, procs]) => (
            <div key={banda} className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{BANDA[banda] ?? banda}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {procs.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="checkbox" name="procesosIds" value={p.id} className="h-4 w-4"
                      checked={procesosSel.has(p.id)}
                      onChange={() => toggle(procesosSel, setProcesosSel, p.id)}
                    />
                    <span>
                      <span className="font-mono text-xs">{p.codigo}</span> · {p.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Alcance total: {totalAlcance} ítem{totalAlcance !== 1 ? "s" : ""} ({normasSel.size} norma{normasSel.size !== 1 ? "s" : ""}, {procesosSel.size} proceso{procesosSel.size !== 1 ? "s" : ""}).
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen antes de crear</p>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Auditoría</dt><dd className="font-medium">{titulo || "Sin título"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Fecha</dt><dd className="font-medium">{fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR") : "Sin fecha"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Tipo</dt><dd>{TIPOS.find((item) => item.value === tipo)?.label}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Alcance</dt><dd>{normasSel.size} norma(s) · {procesosSel.size} proceso(s)</dd></div>
            </dl>
          </div>
        </div>

        {errorPaso && (
          <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorPaso}</div>
        )}
        {estado && !estado.ok && (
          <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-4 shadow-[0_-8px_20px_-18px_rgba(0,0,0,0.45)] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-4 sm:shadow-none">
          {paso > 0 ? (
            <Button type="button" variant="outline" onClick={retroceder}><ArrowLeft className="h-4 w-4" />Atrás</Button>
          ) : (
            <span />
          )}
          <div className="flex-1" />
          {enUltimo ? (
            <SubmitButton />
          ) : (
            <Button type="button" onClick={avanzar}>Siguiente<ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>
      </form>
    </div>
  );
}
