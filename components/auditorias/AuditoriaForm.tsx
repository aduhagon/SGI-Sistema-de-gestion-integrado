"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Creando…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" aria-hidden="true" />
          Crear auditoría
        </>
      )}
    </Button>
  );
}

export function AuditoriaForm({ normas, procesos }: Props) {
  const [estado, formAction] = useFormState<EstadoCrearAuditoria, FormData>(
    crearAuditoria,
    null,
  );
  const [tipo, setTipo] = useState("interna");

  const esExterna = TIPOS_EXTERNOS.includes(tipo);

  const procesosPorBanda = procesos.reduce<Record<string, ProcesoParaAlcance[]>>(
    (acc, p) => {
      (acc[p.tipo] ??= []).push(p);
      return acc;
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="titulo" className="text-sm font-medium">Título</label>
          <input
            id="titulo"
            name="titulo"
            required
            placeholder="Ej: Auditoría interna anual del SGI 2026"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tipo" className="text-sm font-medium">Tipo</label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="fechaPlanificada" className="text-sm font-medium">
              Fecha planificada
            </label>
            <input
              id="fechaPlanificada"
              name="fechaPlanificada"
              type="date"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {esExterna && (
          <div className="space-y-2">
            <label htmlFor="entidadCertificadora" className="text-sm font-medium">
              Entidad certificadora
            </label>
            <input
              id="entidadCertificadora"
              name="entidadCertificadora"
              placeholder="Ej: Bureau Veritas, SGS, TÜV…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Obligatoria para auditorías externas, de certificación, vigilancia o recertificación.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="objetivo" className="text-sm font-medium">
            Objetivo <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="objetivo"
            name="objetivo"
            rows={2}
            placeholder="Qué se busca verificar con esta auditoría…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Alcance: normas */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Alcance — Normas</h3>
          <p className="text-xs text-muted-foreground">
            Qué normas se auditan. Marcá al menos una norma o un proceso.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {normas.map((n) => (
            <label
              key={n.versionNormaId}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input type="checkbox" name="normasIds" value={n.versionNormaId} className="h-4 w-4" />
              <span>
                <span className="font-mono text-xs">{n.codigo}</span> · {n.nombreCorto}{" "}
                <span className="text-muted-foreground">{n.version}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Alcance: procesos */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Alcance — Procesos</h3>
          <p className="text-xs text-muted-foreground">Qué procesos entran en la auditoría.</p>
        </div>
        {Object.entries(procesosPorBanda).map(([banda, procs]) => (
          <div key={banda} className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {BANDA[banda] ?? banda}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {procs.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input type="checkbox" name="procesosIds" value={p.id} className="h-4 w-4" />
                  <span>
                    <span className="font-mono text-xs">{p.codigo}</span> · {p.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {estado && !estado.ok && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </div>
      )}

      <div className="flex gap-3">
        <SubmitButton />
      </div>
    </form>
  );
}
