"use client";

import { useState, useTransition } from "react";
import { Boxes } from "lucide-react";
import { SeccionColapsable } from "@/components/procesos/SeccionColapsable";
import type { FormularioErp } from "@/lib/api/integracionErp";
import { marcarOrigenErp } from "@/app/(app)/procesos/[codigo]/integracion-erp-actions";

type Marca = boolean | null;

// Grado de integración (proporción gestionada dentro del ERP) coloreado.
function claseGrado(grado: number | null): string {
  if (grado === null) return "bg-muted text-muted-foreground border-border";
  if (grado >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (grado >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export function IntegracionErpProceso({
  codigoProceso,
  formularios,
}: {
  codigoProceso: string;
  formularios: FormularioErp[];
}) {
  const [marcas, setMarcas] = useState<Record<string, Marca>>(() =>
    Object.fromEntries(formularios.map((f) => [f.documento_id, f.gestionado_en_erp])),
  );
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (formularios.length === 0) return null;

  const enErp = formularios.filter((f) => marcas[f.documento_id] === true).length;
  const fuera = formularios.filter((f) => marcas[f.documento_id] === false).length;
  const sinMarcar = formularios.length - enErp - fuera;
  const grado = enErp + fuera > 0 ? Math.round((100 * enErp) / (enErp + fuera)) : null;
  const gradoCls = claseGrado(grado);

  function cambiar(documentoId: string, destino: Marca) {
    const previo = marcas[documentoId] ?? null;
    const nuevo: Marca = previo === destino ? null : destino;
    setMarcas((m) => ({ ...m, [documentoId]: nuevo }));
    setPendiente(documentoId);
    startTransition(async () => {
      const r = await marcarOrigenErp(documentoId, codigoProceso, nuevo);
      setPendiente(null);
      if (!r.ok) {
        setMarcas((m) => ({ ...m, [documentoId]: previo }));
        alert(r.error);
      }
    });
  }

  return (
    <div className="mb-10">
      <SeccionColapsable
        icon={Boxes}
        titulo="Integración con el ERP"
        conteo={`${enErp} de ${formularios.length} formularios en el ERP`}
        senalCritica={
          grado === null
            ? { texto: "sin marcar", cls: gradoCls }
            : { texto: `${grado}% integración`, cls: gradoCls }
        }
        colorIcono="#0d9488"
      >
        <div className="px-4 py-4">
          <p className="mb-3 text-[11px] text-muted-foreground">
            Marcá cada formulario según dónde se gestiona. El grado de integración es la proporción
            gestionada dentro del ERP
            {sinMarcar > 0 ? ` (${sinMarcar} sin marcar)` : ""}.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {formularios.map((f) => {
              const marca = marcas[f.documento_id] ?? null;
              const busy = pendiente === f.documento_id;
              return (
                <div
                  key={f.documento_id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${busy ? "opacity-50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {f.codigo}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {f.titulo}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => cambiar(f.documento_id, true)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        marca === true
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      En ERP
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => cambiar(f.documento_id, false)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        marca === false
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      Fuera
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SeccionColapsable>
    </div>
  );
}
