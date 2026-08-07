"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Search } from "lucide-react";
import type {
  FragmentoPorRequisito,
  ResultadoBusquedaFragmento,
} from "@/lib/api/referencias";
import type { NormaOpcion } from "@/lib/api/matriz";
import type { RequisitoOpcion } from "@/lib/api/coberturas";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  normas: NormaOpcion[];
  requisitosPorNorma: Record<string, RequisitoOpcion[]>;
  resultadosTexto: ResultadoBusquedaFragmento[];
  resultadosRequisito: FragmentoPorRequisito[];
};

const ETIQUETA_TIPO: Record<string, string> = {
  cita_norma: "Cita norma",
  implementa: "Implementa",
  remite: "Remite",
};

/**
 * Buscador sobre los bloques de texto de los procedimientos vigentes.
 * Dos modos, ambos manejados por querystring para que la página (server
 * component) haga la consulta con la sesión del usuario:
 *   ?q=...                        búsqueda full-text
 *   ?requisito=...&norma=...      vista inversa por requisito
 */
export function BuscadorNormativo({
  normas,
  requisitosPorNorma,
  resultadosTexto,
  resultadosRequisito,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const modo: "texto" | "requisito" = params.get("requisito")
    ? "requisito"
    : "texto";
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const [normaId, setNormaId] = useState(
    params.get("norma") ?? normas[0]?.versionNormaId ?? "",
  );
  const requisitoActual = params.get("requisito");
  const [filtroReq, setFiltroReq] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function irATexto(q: string) {
    const usp = new URLSearchParams();
    if (q.trim().length >= 2) usp.set("q", q.trim());
    router.replace(`/busqueda-normativa${usp.size ? `?${usp}` : ""}`);
  }

  function alEscribir(q: string) {
    setTexto(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => irATexto(q), 400);
  }

  function irARequisito(reqId: string) {
    const usp = new URLSearchParams({ requisito: reqId, norma: normaId });
    router.replace(`/busqueda-normativa?${usp}`);
  }

  const requisitosFiltrados = useMemo(() => {
    const lista = requisitosPorNorma[normaId] ?? [];
    const q = filtroReq.trim().toLowerCase();
    if (!q) return lista.slice(0, 30);
    return lista
      .filter(
        (r) =>
          r.clausula.toLowerCase().includes(q) ||
          r.titulo.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [requisitosPorNorma, normaId, filtroReq]);

  const requisitoSeleccionado = (requisitosPorNorma[normaId] ?? []).find(
    (r) => r.id === requisitoActual,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => irATexto(texto)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            modo === "texto"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Por texto
        </button>
        <button
          type="button"
          onClick={() => {
            const primero = (requisitosPorNorma[normaId] ?? [])[0];
            if (primero) irARequisito(primero.id);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            modo === "requisito"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Por requisito
        </button>
      </div>

      {modo === "texto" ? (
        <>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={texto}
              onChange={(e) => alEscribir(e.target.value)}
              placeholder="Buscar en los procedimientos: retención, autorización de pagos, muestreo…"
              className="pl-9"
              autoFocus
            />
          </div>

          {texto.trim().length >= 2 && resultadosTexto.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sin resultados para “{texto.trim()}”.
            </p>
          )}

          <ul className="space-y-3">
            {resultadosTexto.map((r) => (
              <li
                key={r.fragmentoId}
                className="rounded-md border border-border bg-card p-4"
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <FileText
                    className="h-4 w-4 shrink-0 self-center text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Link
                    href={`/documentos/${r.documentoId}/referencias`}
                    className="font-mono text-xs font-medium hover:underline"
                  >
                    {r.documentoCodigo}
                  </Link>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {r.documentoTitulo}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.numeral ?? "—"}
                  </span>
                  <span className="min-w-0 font-medium">
                    {r.titulo ?? "(sin título)"}
                  </span>
                  {r.pagina != null && (
                    <span className="text-xs text-muted-foreground">
                      pág. {r.pagina}
                    </span>
                  )}
                  {r.referenciasAceptadas > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 text-[11px] text-primary">
                      {r.referenciasAceptadas} ref.
                    </span>
                  )}
                </div>
                <p
                  className="text-sm leading-relaxed text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground"
                  dangerouslySetInnerHTML={{ __html: r.extracto }}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <select
              value={normaId}
              onChange={(e) => setNormaId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {normas.map((n) => (
                <option key={n.versionNormaId} value={n.versionNormaId}>
                  {n.nombreCorto} · {n.version}
                </option>
              ))}
            </select>
            <Input
              value={filtroReq}
              onChange={(e) => setFiltroReq(e.target.value)}
              placeholder="Filtrar requisitos"
            />
            <ul className="max-h-[55vh] overflow-y-auto rounded-md border border-border">
              {requisitosFiltrados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => irARequisito(r.id)}
                    className={cn(
                      "flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm",
                      r.id === requisitoActual
                        ? "bg-primary/10 font-medium"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="shrink-0 font-mono text-xs">{r.clausula}</span>
                    <span className="min-w-0 flex-1 truncate">{r.titulo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {requisitoSeleccionado && (
              <p className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {normas.find((n) => n.versionNormaId === normaId)?.nombreCorto}{" "}
                  · {normas.find((n) => n.versionNormaId === normaId)?.version}
                </span>
                <span className="font-mono text-xs font-medium">
                  {requisitoSeleccionado.clausula}
                </span>{" "}
                {requisitoSeleccionado.titulo}
              </p>
            )}
            {resultadosRequisito.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ningún bloque de los procedimientos vigentes referencia este
                requisito todavía.
              </p>
            ) : (
              <ul className="space-y-3">
                {resultadosRequisito.map((r) => (
                  <li
                    key={r.referenciaId}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                      <Link
                        href={`/documentos/${r.documentoId}/referencias`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {r.documentoCodigo}
                      </Link>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {r.documentoTitulo}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.numeral ?? "—"}
                      </span>
                      <span className="min-w-0 font-medium">
                        {r.fragmentoTitulo ?? "(sin título)"}
                      </span>
                      {r.pagina != null && (
                        <span className="text-xs text-muted-foreground">
                          pág. {r.pagina}
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-2 text-[11px] text-muted-foreground">
                        {ETIQUETA_TIPO[r.tipo] ?? r.tipo}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {r.extracto}
                      {r.extracto.length >= 320 ? "…" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
