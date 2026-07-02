"use client";

import { useMemo, useState } from "react";
import { FileText, Gauge, Wrench, X, Plus } from "lucide-react";
import type { MitiganteRiesgo, DocumentoOpcion, IndicadorOpcion } from "@/lib/api/riesgos";

// Ítem en edición dentro del formulario. Los que vienen de la base traen id;
// los agregados en esta sesión todavía no (se crean al guardar el riesgo).
type Item =
  | { tipo: "documento"; documentoId: string; etiqueta: string }
  | { tipo: "indicador"; indicadorId: string; etiqueta: string }
  | { tipo: "otro"; descripcion: string };

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function desdeInicial(inicial: MitiganteRiesgo[]): Item[] {
  const items: Item[] = [];
  for (const m of inicial) {
    if (m.tipo === "documento" && m.documentoId) {
      items.push({
        tipo: "documento",
        documentoId: m.documentoId,
        etiqueta: `${m.documentoCodigo ?? "?"} — ${m.documentoTitulo ?? ""}`.trim(),
      });
    } else if (m.tipo === "indicador" && m.indicadorId) {
      items.push({
        tipo: "indicador",
        indicadorId: m.indicadorId,
        etiqueta: `${m.indicadorCodigo ?? "?"} — ${m.indicadorNombre ?? ""}`.trim(),
      });
    } else if (m.tipo === "otro" && m.descripcion) {
      items.push({ tipo: "otro", descripcion: m.descripcion });
    }
  }
  return items;
}

// Lo que viaja al servidor en el input oculto (sin etiquetas de display).
function paraServidor(items: Item[]) {
  return items.map((i) =>
    i.tipo === "documento"
      ? { tipo: "documento", documentoId: i.documentoId }
      : i.tipo === "indicador"
        ? { tipo: "indicador", indicadorId: i.indicadorId }
        : { tipo: "otro", descripcion: i.descripcion },
  );
}

export function MitigantesEditor({
  inicial,
  documentos,
  indicadores,
}: {
  inicial: MitiganteRiesgo[];
  documentos: DocumentoOpcion[];
  indicadores: IndicadorOpcion[];
}) {
  const [items, setItems] = useState<Item[]>(() => desdeInicial(inicial));
  const [otroTexto, setOtroTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const docsVinculados = useMemo(
    () => new Set(items.filter((i): i is Extract<Item, { tipo: "documento" }> => i.tipo === "documento").map((i) => i.documentoId)),
    [items],
  );
  const indsVinculados = useMemo(
    () => new Set(items.filter((i): i is Extract<Item, { tipo: "indicador" }> => i.tipo === "indicador").map((i) => i.indicadorId)),
    [items],
  );

  function agregarDocumento(id: string) {
    if (!id || docsVinculados.has(id)) return;
    const d = documentos.find((x) => x.id === id);
    if (!d) return;
    setAviso(null);
    setItems((prev) => [...prev, { tipo: "documento", documentoId: d.id, etiqueta: `${d.codigo} — ${d.titulo}` }]);
  }

  function agregarIndicador(id: string) {
    if (!id || indsVinculados.has(id)) return;
    const ind = indicadores.find((x) => x.id === id);
    if (!ind) return;
    setAviso(null);
    setItems((prev) => [...prev, { tipo: "indicador", indicadorId: ind.id, etiqueta: `${ind.codigo} — ${ind.nombre}` }]);
  }

  function agregarOtro() {
    const texto = otroTexto.trim();
    if (texto.length < 5) {
      setAviso("Describí el control con al menos 5 caracteres.");
      return;
    }
    const yaExiste = items.some((i) => i.tipo === "otro" && i.descripcion.trim().toLowerCase() === texto.toLowerCase());
    if (yaExiste) {
      setAviso("Ese control ya está en la lista.");
      return;
    }
    setAviso(null);
    setItems((prev) => [...prev, { tipo: "otro", descripcion: texto }]);
    setOtroTexto("");
  }

  function quitar(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <input type="hidden" name="mitigantes" value={JSON.stringify(paraServidor(items))} />

      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((it, idx) => (
            <li
              key={it.tipo === "documento" ? `d-${it.documentoId}` : it.tipo === "indicador" ? `i-${it.indicadorId}` : `o-${it.descripcion}`}
              className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm"
            >
              {it.tipo === "documento" && <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />}
              {it.tipo === "indicador" && <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden="true" />}
              {it.tipo === "otro" && <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1 leading-snug">
                {it.tipo === "otro" ? it.descripcion : it.etiqueta}
              </span>
              <button
                type="button"
                onClick={() => quitar(idx)}
                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Quitar mitigante"
                aria-label="Quitar mitigante"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Todavía no hay controles vinculados. Podés referenciar un documento del SGI, un indicador, u otro control.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value=""
          onChange={(e) => agregarDocumento(e.target.value)}
          className={INPUT}
          aria-label="Vincular documento"
        >
          <option value="">+ Vincular documento…</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id} disabled={docsVinculados.has(d.id)}>
              {d.codigo} — {d.titulo}
            </option>
          ))}
        </select>
        <select
          value=""
          onChange={(e) => agregarIndicador(e.target.value)}
          className={INPUT}
          aria-label="Vincular indicador"
        >
          <option value="">+ Vincular indicador…</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id} disabled={indsVinculados.has(i.id)}>
              {i.codigo} — {i.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <input
          value={otroTexto}
          onChange={(e) => { setOtroTexto(e.target.value); if (aviso) setAviso(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOtro(); } }}
          placeholder="Otro control (ej: capacitación anual, control físico)…"
          className={INPUT}
          aria-label="Otro control"
        />
        <button
          type="button"
          onClick={agregarOtro}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Agregar
        </button>
      </div>

      {aviso && <p className="text-xs text-destructive">{aviso}</p>}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Los documentos vinculados apuntan siempre a su versión vigente. Estos controles son la evidencia
        de con qué se mitiga el riesgo (ISO 9001/14001/45001 §6.1).
      </p>
    </div>
  );
}
