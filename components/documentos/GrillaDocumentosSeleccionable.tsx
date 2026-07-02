"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Archive,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Download,
} from "lucide-react";
import ExcelJS from "exceljs";
import type { DocumentSummary } from "@/lib/api/documentos";
import { StatusDot } from "@/components/documentos/StatusDot";
import { obsoletarDocumentosEnLote } from "@/app/(app)/documentos/obsoletar-lote-actions";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError } from "@/components/ui/modal";

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
  const [orden, setOrden] = useState<OrdenTipo>("jerarquia");

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

  // Documentos ordenados según el selector.
  const documentosOrdenados = useMemo(
    () => ordenarDocumentos(documentos, orden),
    [documentos, orden],
  );

  // Exportar a Excel (ExcelJS): si hay selección, exporta lo tildado; si no, lo visible/filtrado.
  async function exportarExcel() {
    const fuente =
      seleccion.size > 0
        ? documentosOrdenados.filter((d) => seleccion.has(d.id))
        : documentosOrdenados;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Documentos");

    ws.columns = [
      { header: "Código", key: "codigo", width: 20 },
      { header: "Título", key: "titulo", width: 32 },
      { header: "Descripción", key: "descripcion", width: 40 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Tipo", key: "tipo", width: 18 },
      { header: "Proceso", key: "proceso", width: 28 },
      { header: "Normas", key: "normas", width: 20 },
      { header: "Actualizado", key: "actualizado", width: 14 },
    ];

    // Encabezado en negrita.
    ws.getRow(1).font = { bold: true };

    for (const d of fuente) {
      ws.addRow({
        codigo: d.codigo,
        titulo: d.titulo,
        descripcion: d.descripcion_corta ?? "",
        estado: traducirEstado(d.estado_actual),
        tipo: d.tipo?.nombre ?? "",
        proceso: d.proceso ? `${d.proceso.codigo} — ${d.proceso.nombre}` : "",
        normas: d.normas.map((n) => n.nombre_corto).join(", "),
        actualizado: formatearFechaRelativa(d.actualizado_en ?? d.creado_en),
      });
    }

    // Generar el archivo y descargarlo.
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentos-sgi-${fecha}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {exito && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{exito}</span>
        </div>
      )}

      {/* Barra de herramientas: ordenar + exportar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="orden-docs" className="text-sm text-muted-foreground">Ordenar por:</label>
          <select
            id="orden-docs"
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenTipo)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="jerarquia">Jerarquía</option>
            <option value="proceso">Proceso</option>
            <option value="codigo">Código</option>
            <option value="fecha">Fecha</option>
          </select>
        </div>

        <button
          type="button"
          onClick={exportarExcel}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {seleccion.size > 0 ? `Exportar ${seleccion.size} a Excel` : "Exportar a Excel"}
        </button>
      </div>

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
        {documentosOrdenados.map((doc) => {
          const esObsoleto = doc.estado_actual === "obsoleto";
          const esRechazado = doc.estado_actual === "rechazado";
          const tildado = seleccion.has(doc.id);
          return (
            <div
              key={doc.id}
              className={
                "flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors " +
                (tildado
                  ? "bg-primary/5"
                  : esRechazado
                  ? "border-l-2 border-l-rose-400 bg-rose-50/40 hover:bg-rose-50/70"
                  : "hover:bg-muted/60")
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
      <ModalShell abierto={dialogoAbierto} onClose={() => { if (!pending) setDialogoAbierto(false); }} maxWidth="max-w-md">
        <ModalHeader>
          <div className="flex items-start gap-3">
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
        </ModalHeader>

        <ModalBody>
            <div className="pb-1">
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

        </ModalBody>

        <ModalFooter>
          <ModalError mensaje={error} />
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
        </ModalFooter>
      </ModalShell>
    </div>
  );
}

type OrdenTipo = "jerarquia" | "proceso" | "codigo" | "fecha";

function ordenarDocumentos(docs: DocumentSummary[], orden: OrdenTipo): DocumentSummary[] {
  const copia = [...docs];
  switch (orden) {
    case "codigo":
      return copia.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    case "fecha":
      return copia.sort((a, b) => {
        const fa = new Date(a.actualizado_en ?? a.creado_en).getTime();
        const fb = new Date(b.actualizado_en ?? b.creado_en).getTime();
        return fb - fa; // más reciente primero
      });
    case "proceso":
      return copia.sort((a, b) => {
        const pa = a.proceso?.codigo ?? "zzz";
        const pb = b.proceso?.codigo ?? "zzz";
        if (pa !== pb) return pa.localeCompare(pb, "es");
        return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
      });
    case "jerarquia":
    default:
      return ordenarPorJerarquia(copia);
  }
}

// Ordena padres seguidos de sus hijos. Usa documento_padre_id; los huérfanos
// (sin padre en la lista) se tratan como raíces.
function ordenarPorJerarquia(docs: DocumentSummary[]): DocumentSummary[] {
  const porId = new Map(docs.map((d) => [d.id, d]));
  const hijosDe = new Map<string | null, DocumentSummary[]>();
  for (const d of docs) {
    // Si el padre no está en la lista visible, tratarlo como raíz.
    const padre = d.documento_padre_id && porId.has(d.documento_padre_id)
      ? d.documento_padre_id
      : null;
    if (!hijosDe.has(padre)) hijosDe.set(padre, []);
    hijosDe.get(padre)!.push(d);
  }
  // Ordenar cada nivel por código.
  for (const lista of hijosDe.values()) {
    lista.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  }
  const resultado: DocumentSummary[] = [];
  function agregar(padreId: string | null) {
    for (const d of hijosDe.get(padreId) ?? []) {
      resultado.push(d);
      agregar(d.id);
    }
  }
  agregar(null);
  return resultado;
}

function traducirEstado(estado: string): string {
  const map: Record<string, string> = {
    borrador: "Borrador",
    confeccionado: "Confeccionado",
    pendiente_aprobacion: "Pendiente aprobación",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    obsoleto: "Obsoleto",
  };
  return map[estado] ?? estado;
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
