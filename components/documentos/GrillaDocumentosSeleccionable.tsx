"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Archive,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { DocumentSummary } from "@/lib/api/documentos";
import { StatusDot } from "@/components/documentos/StatusDot";
import { obsoletarDocumentosEnLote } from "@/app/(app)/documentos/obsoletar-lote-actions";

/**
 * Grilla de documentos con selección múltiple para acciones en lote.
 * Acción disponible: marcar como obsoletos (discontinuar) con un motivo común.
 *
 * El checkbox vive FUERA del Link de cada fila, para que tildar no navegue al
 * detalle. La fila sigue siendo navegable en el resto de su superficie.
 */

type Props = {
  documentos: DocumentSummary[];
  /** Si es false, no muestra checkboxes ni acciones en lote (listado normal). */
  puedeObsoletar?: boolean;
};

export function GrillaDocumentosSeleccionable({
  documentos,
  puedeObsoletar = false,
}: Props) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Solo se pueden obsoletar documentos que no estén ya obsoletos.
  const seleccionables = documentos.filter((d) => d.estado_actual !== "obsoleto");
  const todosSeleccionados =
    seleccionables.length > 0 && seleccion.size === seleccionables.length;

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccion(new Set());
    } else {
      setSeleccion(new Set(seleccionables.map((d) => d.id)));
    }
  }

  function abrirDialogo() {
    setError(null);
    setExito(null);
    setMotivo("");
    setDialogoAbierto(true);
  }

  function confirmar() {
    setError(null);
    if (motivo.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres).");
      return;
    }
    const ids = Array.from(seleccion);
    startTransition(async () => {
      const r = await obsoletarDocumentosEnLote(ids, motivo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDialogoAbierto(false);
      setSeleccion(new Set());
      setExito(
        `${r.obsoletados} documento${r.obsoletados !== 1 ? "s" : ""} marcado${
          r.obsoletados !== 1 ? "s" : ""
        } como obsoleto${r.obsoletados !== 1 ? "s" : ""}.` +
          (r.omitidos > 0 ? ` ${r.omitidos} omitido(s).` : ""),
      );
      router.refresh();
      setTimeout(() => setExito(null), 6000);
    });
  }

  return (
    <div>
      {exito && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{exito}</span>
        </div>
      )}

      {/* Encabezado con seleccionar todos */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
        {puedeObsoletar && (
          <input
            type="checkbox"
            checked={todosSeleccionados}
            onChange={toggleTodos}
            disabled={seleccionables.length === 0}
            className="h-4 w-4 rounded border-input"
            aria-label="Seleccionar todos"
            title="Seleccionar todos"
          />
        )}
        <span className="w-32 shrink-0">Código</span>
        <span className="flex-1">Documento</span>
        <span className="hidden md:block max-w-md shrink-0">Tipo · Proceso · Normas</span>
        <span className="hidden lg:block w-24 text-right shrink-0">Actualizado</span>
        <span className="w-4" />
      </div>

      {/* Filas */}
      <div>
        {documentos.map((doc) => {
          const esObsoleto = doc.estado_actual === "obsoleto";
          const tildado = seleccion.has(doc.id);
          return (
            <div
              key={doc.id}
              className={
                "flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors " +
                (tildado ? "bg-primary/5" : "hover:bg-muted/40")
              }
            >
              {puedeObsoletar && (
                <input
                  type="checkbox"
                  checked={tildado}
                  onChange={() => toggle(doc.id)}
                  disabled={esObsoleto}
                  className="h-4 w-4 rounded border-input"
                  aria-label={`Seleccionar ${doc.codigo}`}
                  title={esObsoleto ? "Ya está obsoleto" : `Seleccionar ${doc.codigo}`}
                />
              )}

              <Link
                href={`/documentos/${doc.id}`}
                className="group flex flex-1 items-center gap-4 min-w-0"
              >
                <StatusDot estado={doc.estado_actual} />

                <div className="font-mono text-xs text-muted-foreground tabular-nums w-32 shrink-0 truncate">
                  {doc.codigo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {doc.titulo}
                  </div>
                  {doc.descripcion_corta && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {doc.descripcion_corta}
                    </div>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground shrink-0 max-w-md">
                  {doc.tipo && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium tracking-tight"
                      style={{
                        backgroundColor: `${doc.tipo.color_hex ?? "#475569"}15`,
                        color: doc.tipo.color_hex ?? "#475569",
                      }}
                    >
                      {doc.tipo.codigo}
                    </span>
                  )}
                  {doc.proceso && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="truncate max-w-[150px]" title={doc.proceso.nombre}>
                        {doc.proceso.codigo}
                      </span>
                    </>
                  )}
                  {doc.normas.length > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span
                        className="truncate max-w-[120px]"
                        title={doc.normas.map((n) => n.nombre_corto).join(", ")}
                      >
                        {doc.normas.length === 1
                          ? doc.normas[0].codigo
                          : `${doc.normas.length} normas`}
                      </span>
                    </>
                  )}
                </div>

                <div className="hidden lg:block text-xs text-muted-foreground w-24 text-right shrink-0 tabular-nums">
                  {formatearFechaRelativa(doc.actualizado_en ?? doc.creado_en)}
                </div>

                <ChevronRight
                  className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Barra de acciones flotante */}
      {puedeObsoletar && seleccion.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-border bg-card px-5 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {seleccion.size} seleccionado{seleccion.size !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => setSeleccion(new Set())}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar
          </button>
          <div className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={abrirDialogo}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3.5 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Marcar como obsoletos
          </button>
        </div>
      )}

      {/* Diálogo de confirmación con motivo */}
      {dialogoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">
                  Marcar {seleccion.size} documento{seleccion.size !== 1 ? "s" : ""} como obsoleto
                  {seleccion.size !== 1 ? "s" : ""}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los documentos quedarán discontinuados y saldrán del sistema vivo.
                  Esta acción registra el motivo y queda en la auditoría.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="motivo-obsoletar" className="mb-1.5 block text-sm font-medium">
                Motivo (común a todos)
              </label>
              <textarea
                id="motivo-obsoletar"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={pending}
                placeholder="Por qué se discontinúan estos documentos…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialogoAbierto(false)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatearFechaRelativa(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDias === 1) return "ayer";
  if (diffDias < 7) return `hace ${diffDias}d`;
  const esMismoAnio = fecha.getFullYear() === ahora.getFullYear();
  const opciones: Intl.DateTimeFormatOptions = esMismoAnio
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return fecha.toLocaleDateString("es-AR", opciones);
}
