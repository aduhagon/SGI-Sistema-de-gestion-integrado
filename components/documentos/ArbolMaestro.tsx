"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderTree,
  FileSpreadsheet,
  X,
} from "lucide-react";
import type { ProcesoMaestro, DocNodo } from "@/lib/api/arbolMaestro";

/**
 * Árbol maestro de documentos: Proceso → documentos raíz → hijos.
 * Cada proceso es una sección colapsable; dentro, los documentos se anidan por
 * jerarquía con indentación.
 *
 * Incluye filtros combinados (norma y estado: OR dentro de cada eje, AND entre
 * ejes), chip de versión por documento y exportación a Excel de la vista
 * filtrada. Cuando un documento matchea el filtro pero su padre no, el padre
 * se muestra atenuado para conservar el contexto jerárquico.
 */

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  confeccionado: "Confeccionado",
  pendiente_aprobacion: "Pendiente",
  aprobado: "Vigente",
  rechazado: "Rechazado",
  obsoleto: "Obsoleto",
};

const ORDEN_ESTADOS = [
  "borrador",
  "confeccionado",
  "pendiente_aprobacion",
  "aprobado",
  "rechazado",
  "obsoleto",
];

const SIN_NORMA = "Sin norma";

function colorEstado(estado: string): string {
  switch (estado) {
    case "aprobado":
      return "bg-emerald-500/10 text-emerald-700";
    case "pendiente_aprobacion":
    case "confeccionado":
      return "bg-amber-500/10 text-amber-700";
    case "rechazado":
      return "bg-destructive/10 text-destructive";
    case "obsoleto":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-stone-400/10 text-stone-600";
  }
}

type Filtros = {
  normas: Set<string>;
  estados: Set<string>;
};

function pasaFiltro(nodo: DocNodo, filtros: Filtros): boolean {
  const okNorma =
    filtros.normas.size === 0 ||
    (nodo.normas.length === 0
      ? filtros.normas.has(SIN_NORMA)
      : nodo.normas.some((n) => filtros.normas.has(n)));
  const okEstado = filtros.estados.size === 0 || filtros.estados.has(nodo.estado);
  return okNorma && okEstado;
}

/** Poda el árbol: conserva nodos que pasan el filtro y ancestros de esos nodos
 *  (marcados como contexto). Devuelve null si nada del subárbol es visible. */
type NodoFiltrado = { nodo: DocNodo; esContexto: boolean; hijos: NodoFiltrado[] };

function podar(nodo: DocNodo, filtros: Filtros): NodoFiltrado | null {
  const hijos = nodo.hijos
    .map((h) => podar(h, filtros))
    .filter((h): h is NodoFiltrado => h !== null);
  const matchea = pasaFiltro(nodo, filtros);
  if (!matchea && hijos.length === 0) return null;
  return { nodo, esContexto: !matchea, hijos };
}

function contarVisibles(f: NodoFiltrado): number {
  return (f.esContexto ? 0 : 1) + f.hijos.reduce((acc, h) => acc + contarVisibles(h), 0);
}

/** Aplana la vista filtrada (solo documentos que matchean, no el contexto). */
function aplanarParaExport(
  filas: NodoFiltrado[],
  proceso: string,
  out: { nodo: DocNodo; proceso: string }[],
) {
  for (const f of filas) {
    if (!f.esContexto) out.push({ nodo: f.nodo, proceso });
    aplanarParaExport(f.hijos, proceso, out);
  }
}

export function ArbolMaestro({
  procesos,
  sinProceso,
}: {
  procesos: ProcesoMaestro[];
  sinProceso: DocNodo[];
}) {
  const [filtroNormas, setFiltroNormas] = useState<Set<string>>(new Set());
  const [filtroEstados, setFiltroEstados] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);

  const filtros: Filtros = { normas: filtroNormas, estados: filtroEstados };
  const hayFiltro = filtroNormas.size > 0 || filtroEstados.size > 0;

  // Opciones de filtro derivadas de los datos reales (sin chips vacíos).
  const { normasDisponibles, estadosDisponibles, totalDocs } = useMemo(() => {
    const normas = new Set<string>();
    const estados = new Set<string>();
    let total = 0;
    let haySinNorma = false;
    const recorrer = (n: DocNodo) => {
      total++;
      if (n.normas.length === 0) haySinNorma = true;
      n.normas.forEach((x) => normas.add(x));
      estados.add(n.estado);
      n.hijos.forEach(recorrer);
    };
    procesos.forEach((p) => p.documentos.forEach(recorrer));
    sinProceso.forEach(recorrer);
    const listaNormas = Array.from(normas).sort((a, b) => a.localeCompare(b));
    if (haySinNorma) listaNormas.push(SIN_NORMA);
    const listaEstados = ORDEN_ESTADOS.filter((e) => estados.has(e));
    return {
      normasDisponibles: listaNormas,
      estadosDisponibles: listaEstados,
      totalDocs: total,
    };
  }, [procesos, sinProceso]);

  // Podar cada sección según los filtros.
  const secciones = useMemo(() => {
    const todas = [
      ...procesos,
      ...(sinProceso.length > 0
        ? [
            {
              id: "sin-proceso",
              codigo: "—",
              nombre: "Sin proceso asignado",
              tipo: null,
              colorHex: null,
              documentos: sinProceso,
              totalDocumentos: sinProceso.length,
            } satisfies ProcesoMaestro,
          ]
        : []),
    ];
    return todas
      .map((proc) => {
        const filas = proc.documentos
          .map((n) => podar(n, filtros))
          .filter((f): f is NodoFiltrado => f !== null);
        const visibles = filas.reduce((acc, f) => acc + contarVisibles(f), 0);
        return { proc, filas, visibles };
      })
      .filter((s) => s.filas.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procesos, sinProceso, filtroNormas, filtroEstados]);

  const totalVisibles = secciones.reduce((acc, s) => acc + s.visibles, 0);

  function toggle(set: Set<string>, valor: string, setter: (s: Set<string>) => void) {
    const nuevo = new Set(set);
    if (nuevo.has(valor)) nuevo.delete(valor);
    else nuevo.add(valor);
    setter(nuevo);
  }

  async function exportarExcel() {
    setExportando(true);
    try {
      const XLSX = await import("xlsx");
      const filas: { nodo: DocNodo; proceso: string }[] = [];
      for (const s of secciones) {
        aplanarParaExport(s.filas, `${s.proc.codigo} ${s.proc.nombre}`, filas);
      }
      const datos = filas.map(({ nodo, proceso }) => ({
        Código: nodo.codigo,
        Título: nodo.titulo,
        Proceso: proceso,
        Tipo: nodo.tipoCodigo ?? "",
        Versión: nodo.version ?? "",
        "Versión vigente": nodo.versionVigente ? "Sí" : "No",
        Estado: ESTADO_LABEL[nodo.estado] ?? nodo.estado,
        Normas: nodo.normas.join(", "),
        "Fecha aprobación": nodo.fechaAprobado
          ? new Date(nodo.fechaAprobado).toLocaleDateString("es-AR")
          : "",
      }));
      const hoja = XLSX.utils.json_to_sheet(datos);
      hoja["!cols"] = [
        { wch: 20 },
        { wch: 48 },
        { wch: 32 },
        { wch: 8 },
        { wch: 9 },
        { wch: 14 },
        { wch: 13 },
        { wch: 28 },
        { wch: 16 },
      ];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Listado maestro");
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(libro, `listado-maestro-${fecha}.xlsx`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 text-xs text-muted-foreground shrink-0">Norma</span>
          {normasDisponibles.map((n) => (
            <FiltroChip
              key={n}
              label={n}
              activo={filtroNormas.has(n)}
              onClick={() => toggle(filtroNormas, n, setFiltroNormas)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 text-xs text-muted-foreground shrink-0">Estado</span>
          {estadosDisponibles.map((e) => (
            <FiltroChip
              key={e}
              label={ESTADO_LABEL[e] ?? e}
              activo={filtroEstados.has(e)}
              onClick={() => toggle(filtroEstados, e, setFiltroEstados)}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-2">
          <span className="flex-1 text-sm text-muted-foreground tabular-nums">
            {totalVisibles} de {totalDocs} documento{totalDocs !== 1 ? "s" : ""}
            {hayFiltro ? " (filtrado)" : ""}
          </span>
          {hayFiltro && (
            <button
              type="button"
              onClick={() => {
                setFiltroNormas(new Set());
                setFiltroEstados(new Set());
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            onClick={exportarExcel}
            disabled={exportando || totalVisibles === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            {exportando ? "Exportando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {secciones.map(({ proc, filas, visibles }) => (
        <ProcesoSeccion key={proc.id} proceso={proc} filas={filas} visibles={visibles} />
      ))}

      {secciones.length === 0 && hayFiltro && (
        <div className="rounded-lg border border-dashed border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Ningún documento coincide con los filtros seleccionados.
          </p>
        </div>
      )}

      {secciones.length === 0 && !hayFiltro && (
        <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <FolderTree className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Todavía no hay documentos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando cargues documentos y los asignes a procesos, vas a verlos acá
            organizados jerárquicamente.
          </p>
        </div>
      )}
    </div>
  );
}

function FiltroChip({
  label,
  activo,
  onClick,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={
        "rounded-full px-2.5 py-0.5 text-xs transition-colors " +
        (activo
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function ProcesoSeccion({
  proceso,
  filas,
  visibles,
}: {
  proceso: ProcesoMaestro;
  filas: NodoFiltrado[];
  visibles: number;
}) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {abierto ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: proceso.colorHex ?? "#94a3b8" }}
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {proceso.codigo}
        </span>
        <span className="font-medium text-sm flex-1 truncate">{proceso.nombre}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
          {visibles} doc{visibles !== 1 ? "s" : ""}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-border px-2 py-2">
          {filas.map((f) => (
            <NodoDoc key={f.nodo.id} fila={f} nivel={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodoDoc({ fila, nivel }: { fila: NodoFiltrado; nivel: number }) {
  const { nodo, esContexto, hijos } = fila;
  const tieneHijos = hijos.length > 0;

  return (
    <div>
      <Link
        href={`/documentos/${nodo.id}`}
        className={
          "group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/50" +
          (esContexto ? " opacity-45" : "")
        }
        style={{ paddingLeft: `${nivel * 24 + 8}px` }}
      >
        {tieneHijos || nodo.hijos.length > 0 ? (
          <FolderTree className="h-4 w-4 text-amber-600/70 shrink-0" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" aria-hidden="true" />
        )}
        <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
          {nodo.codigo}
        </span>
        <span className="text-sm flex-1 truncate group-hover:text-foreground">
          {nodo.titulo}
        </span>
        {nodo.version && (
          <span
            className={
              "hidden sm:inline font-mono text-[11px] shrink-0 rounded px-1.5 py-0.5 " +
              (nodo.versionVigente
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground")
            }
            title={nodo.versionVigente ? "Versión vigente" : "Última versión (no vigente)"}
          >
            v{nodo.version}
          </span>
        )}
        {nodo.tipoCodigo && (
          <span
            className="hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
            style={{
              backgroundColor: `${nodo.tipoColor ?? "#475569"}15`,
              color: nodo.tipoColor ?? "#475569",
            }}
          >
            {nodo.tipoCodigo}
          </span>
        )}
        <span
          className={
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0 " +
            colorEstado(nodo.estado)
          }
        >
          {ESTADO_LABEL[nodo.estado] ?? nodo.estado}
        </span>
      </Link>

      {hijos.map((h) => (
        <NodoDoc key={h.nodo.id} fila={h} nivel={nivel + 1} />
      ))}
    </div>
  );
}
