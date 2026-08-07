"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { FragmentoDeDocumento } from "@/lib/api/referencias";
import type { NormaOpcion } from "@/lib/api/matriz";
import type { RequisitoOpcion } from "@/lib/api/coberturas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  crearReferencia,
  eliminarReferencia,
} from "@/app/(app)/documentos/[id]/referencias/referencias-actions";

type Props = {
  documentoId: string;
  fragmentos: FragmentoDeDocumento[];
  normas: NormaOpcion[];
  requisitosPorNorma: Record<string, RequisitoOpcion[]>;
  puedeEditar: boolean;
};

const TIPOS: { valor: "cita_norma" | "implementa" | "remite"; etiqueta: string }[] = [
  { valor: "cita_norma", etiqueta: "Cita norma" },
  { valor: "implementa", etiqueta: "Implementa" },
  { valor: "remite", etiqueta: "Remite" },
];

const COLOR_TIPO: Record<string, string> = {
  cita_norma: "bg-sky-100 text-sky-800",
  implementa: "bg-emerald-100 text-emerald-800",
  remite: "bg-amber-100 text-amber-800",
};

export function PanelReferenciado({
  documentoId,
  fragmentos,
  normas,
  requisitosPorNorma,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [fragmentoId, setFragmentoId] = useState<string | null>(
    fragmentos[0]?.id ?? null,
  );
  const [normaId, setNormaId] = useState<string>(normas[0]?.versionNormaId ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [requisitoId, setRequisitoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"cita_norma" | "implementa" | "remite">("implementa");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fragmento = fragmentos.find((f) => f.id === fragmentoId) ?? null;

  const candidatos = useMemo(() => {
    const lista = requisitosPorNorma[normaId] ?? [];
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return lista
      .filter(
        (r) =>
          r.clausula.toLowerCase().includes(q) ||
          r.titulo.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [requisitosPorNorma, normaId, busqueda]);

  const seleccionado =
    (requisitosPorNorma[normaId] ?? []).find((r) => r.id === requisitoId) ?? null;

  async function guardar() {
    if (!fragmento || !seleccionado) return;
    setGuardando(true);
    setError(null);
    const r = await crearReferencia({
      fragmentoId: fragmento.id,
      requisitoId: seleccionado.id,
      tipo,
      documentoId,
    });
    setGuardando(false);
    if (r?.ok) {
      setRequisitoId(null);
      setBusqueda("");
      router.refresh();
    } else if (r) {
      setError(r.error);
    }
  }

  async function quitar(referenciaId: string) {
    setEliminando(referenciaId);
    const r = await eliminarReferencia(documentoId, referenciaId);
    setEliminando(null);
    if (r?.ok) router.refresh();
  }

  if (fragmentos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Este documento todavía no tiene bloques extraídos. La extracción corre
        automáticamente sobre la versión vigente de los procedimientos; si creés
        que falta, avisale al Administrador del SGI.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-md border border-border md:grid-cols-[260px_1fr]">
      <aside className="max-h-[70vh] overflow-y-auto border-b border-border bg-muted/30 md:border-b-0 md:border-r">
        <p className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Bloques del documento
        </p>
        <ul>
          {fragmentos.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setFragmentoId(f.id);
                  setRequisitoId(null);
                  setError(null);
                }}
                className={cn(
                  "flex w-full items-baseline gap-2 px-4 py-2 text-left text-sm transition-colors",
                  f.id === fragmentoId
                    ? "border-l-2 border-primary bg-primary/10 font-medium"
                    : "border-l-2 border-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="shrink-0 font-mono text-xs">
                  {f.numeral ?? "—"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {f.titulo ?? (f.tipo === "preambulo" ? "Preámbulo" : "(sin título)")}
                </span>
                {f.referencias.length > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 text-[11px] text-primary">
                    {f.referencias.length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0 p-4">
        {fragmento && (
          <>
            <div className="mb-4 rounded-md border border-border bg-card p-3">
              <p className="mb-1 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {fragmento.numeral ?? "—"}
                  {fragmento.titulo ? ` · ${fragmento.titulo}` : ""}
                  {fragmento.pagina ? ` · pág. ${fragmento.pagina}` : ""}
                </span>
                <span className="shrink-0">
                  {fragmento.texto.length.toLocaleString("es-AR")} caracteres
                </span>
              </p>
              <p className="max-h-72 overflow-y-auto whitespace-pre-line text-sm leading-relaxed">
                {fragmento.texto}
              </p>
            </div>

            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Referencias de este bloque
            </p>
            {fragmento.referencias.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Sin referencias todavía.
              </p>
            ) : (
              <ul className="mb-4 space-y-2">
                {fragmento.referencias.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px]",
                        COLOR_TIPO[r.tipo] ?? "bg-muted",
                      )}
                    >
                      {TIPOS.find((t) => t.valor === r.tipo)?.etiqueta ?? r.tipo}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {r.normaCodigo} ·{" "}
                      <span className="font-mono text-xs">{r.clausula}</span>{" "}
                      {r.requisitoTitulo}
                    </span>
                    {puedeEditar && (
                      <button
                        type="button"
                        aria-label="Quitar referencia"
                        onClick={() => quitar(r.id)}
                        disabled={eliminando === r.id}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        {eliminando === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {puedeEditar && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Agregar referencia
                </p>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={normaId}
                    onChange={(e) => {
                      setNormaId(e.target.value);
                      setRequisitoId(null);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-44"
                  >
                    {normas.map((n) => (
                      <option key={n.versionNormaId} value={n.versionNormaId}>
                        {n.nombreCorto} · {n.version}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      value={busqueda}
                      onChange={(e) => {
                        setBusqueda(e.target.value);
                        setRequisitoId(null);
                      }}
                      placeholder="Buscar requisito por cláusula o título"
                      className="pl-8"
                    />
                  </div>
                </div>

                {busqueda.trim().length >= 2 && !seleccionado && (
                  <ul className="mb-2 max-h-44 overflow-y-auto rounded-md border border-border">
                    {candidatos.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted-foreground">
                        Sin coincidencias en {normas.find((n) => n.versionNormaId === normaId)?.codigo ?? "la norma"}.
                      </li>
                    ) : (
                      candidatos.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setRequisitoId(r.id)}
                            className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <span className="shrink-0 font-mono text-xs">
                              {r.clausula}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{r.titulo}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}

                {seleccionado && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                    <span className="font-mono text-xs font-medium">
                      {seleccionado.clausula}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{seleccionado.titulo}</span>
                    <button
                      type="button"
                      onClick={() => setRequisitoId(null)}
                      className="text-xs text-muted-foreground underline"
                    >
                      cambiar
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  {TIPOS.map((t) => (
                    <button
                      key={t.valor}
                      type="button"
                      onClick={() => setTipo(t.valor)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        tipo === t.valor
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t.etiqueta}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    className="ml-auto"
                    disabled={!seleccionado || guardando}
                    onClick={guardar}
                  >
                    {guardando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Guardar referencia
                  </Button>
                </div>

                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
