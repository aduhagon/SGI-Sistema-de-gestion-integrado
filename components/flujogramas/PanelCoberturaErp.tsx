"use client";

import { useEffect, useState, useTransition } from "react";
import { Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FormularioErp } from "@/lib/api/integracionErp";
import { marcarOrigenErp } from "@/app/(app)/procesos/[codigo]/integracion-erp-actions";

type Marca = boolean | null;

/**
 * Panel "Cobertura ERP del proceso" para la vista de flujogramas.
 * Muestra los formularios del proceso seleccionado, marcados como dentro
 * o fuera del ERP, con el porcentaje de cobertura. Lee de la vista
 * v_formulario_proceso (respeta RLS) y guarda con la server action marcarOrigenErp.
 */
export function PanelCoberturaErp({ procesoId }: { procesoId: string | null }) {
  const [forms, setForms] = useState<FormularioErp[] | null>(null);
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!procesoId) {
      setForms(null);
      return;
    }
    let cancelado = false;
    setForms(null);
    (async () => {
      const sb = createClient();
      const { data, error } = await sb
        .from("v_formulario_proceso")
        .select("documento_id, codigo, titulo, criticidad, gestionado_en_erp, sistema_externo")
        .eq("proceso_id", procesoId)
        .order("codigo");
      if (cancelado) return;
      const lista = error ? [] : (((data as unknown) as FormularioErp[]) ?? []);
      setForms(lista);
      setMarcas(Object.fromEntries(lista.map((f) => [f.documento_id, f.gestionado_en_erp])));
    })();
    return () => {
      cancelado = true;
    };
  }, [procesoId]);

  if (!procesoId || !forms || forms.length === 0) return null;

  const enErp = forms.filter((f) => marcas[f.documento_id] === true).length;
  const fuera = forms.filter((f) => marcas[f.documento_id] === false).length;
  const sinMarcar = forms.length - enErp - fuera;
  const grado = enErp + fuera > 0 ? Math.round((100 * enErp) / (enErp + fuera)) : null;

  function cambiar(documentoId: string, destino: Marca) {
    const previo = marcas[documentoId] ?? null;
    const nuevo: Marca = previo === destino ? null : destino;
    setMarcas((m) => ({ ...m, [documentoId]: nuevo }));
    setPendiente(documentoId);
    startTransition(async () => {
      const r = await marcarOrigenErp(documentoId, "", nuevo);
      setPendiente(null);
      if (!r.ok) {
        setMarcas((m) => ({ ...m, [documentoId]: previo }));
        alert(r.error);
      }
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-teal-600" aria-hidden="true" />
          <h3 className="font-serif text-xs uppercase tracking-[0.2em] text-foreground">
            Cobertura ERP del proceso
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {grado === null ? "sin marcar" : `${grado}% · ${enErp} de ${forms.length} en el ERP`}
        </span>
      </div>

      <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full bg-emerald-500" style={{ width: `${grado ?? 0}%` }} />
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {forms.map((f) => {
          const marca = marcas[f.documento_id] ?? null;
          const busy = pendiente === f.documento_id;
          return (
            <div
              key={f.documento_id}
              className={`flex items-center gap-3 px-3 py-2.5 ${busy ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{f.codigo}</span>
                  <span className="truncate text-sm font-medium text-foreground">{f.titulo}</span>
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
      {sinMarcar > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {sinMarcar} sin marcar (no cuentan en el %).
        </p>
      )}
    </section>
  );
}
