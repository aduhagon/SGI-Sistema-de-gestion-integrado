"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, FileText, FolderTree } from "lucide-react";
import type { ProcesoMaestro, DocNodo } from "@/lib/api/arbolMaestro";

/**
 * Árbol maestro de documentos: Proceso → documentos raíz → hijos.
 * Cada proceso es una sección colapsable; dentro, los documentos se anidan por
 * jerarquía con indentación.
 */

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  confeccionado: "Confeccionado",
  pendiente_aprobacion: "Pendiente",
  aprobado: "Vigente",
  rechazado: "Rechazado",
  obsoleto: "Obsoleto",
};

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

export function ArbolMaestro({
  procesos,
  sinProceso,
}: {
  procesos: ProcesoMaestro[];
  sinProceso: DocNodo[];
}) {
  return (
    <div className="space-y-3">
      {procesos.map((proc) => (
        <ProcesoSeccion key={proc.id} proceso={proc} />
      ))}

      {sinProceso.length > 0 && (
        <ProcesoSeccion
          proceso={{
            id: "sin-proceso",
            codigo: "—",
            nombre: "Sin proceso asignado",
            tipo: null,
            colorHex: null,
            documentos: sinProceso,
            totalDocumentos: sinProceso.length,
          }}
        />
      )}

      {procesos.length === 0 && sinProceso.length === 0 && (
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

function ProcesoSeccion({ proceso }: { proceso: ProcesoMaestro }) {
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
          {proceso.totalDocumentos} doc{proceso.totalDocumentos !== 1 ? "s" : ""}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-border px-2 py-2">
          {proceso.documentos.map((nodo) => (
            <NodoDoc key={nodo.id} nodo={nodo} nivel={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodoDoc({ nodo, nivel }: { nodo: DocNodo; nivel: number }) {
  const tieneHijos = nodo.hijos.length > 0;

  return (
    <div>
      <Link
        href={`/documentos/${nodo.id}`}
        className="group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${nivel * 24 + 8}px` }}
      >
        {tieneHijos ? (
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

      {tieneHijos &&
        nodo.hijos.map((h) => <NodoDoc key={h.id} nodo={h} nivel={nivel + 1} />)}
    </div>
  );
}
