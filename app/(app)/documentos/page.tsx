import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { listarDocumentos } from "@/lib/api/documentos";
import { DocumentRow } from "@/components/documentos/DocumentRow";
import { DocumentEmptyState } from "@/components/documentos/DocumentEmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Listado de documentos del SGI.
 *
 * Estilo "lista de gmail/notion": una fila por documento, info esencial visible,
 * click navega al detalle. Sin filtros aún (se incorporan en Semana 3B).
 */
export default async function DocumentosPage() {
  const documentos = await listarDocumentos();

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
      {/* Encabezado de la página */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Sistema de Gestión Integrado
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2">
            Documentos
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {documentos.length > 0
              ? `${documentos.length} ${
                  documentos.length === 1 ? "documento cargado" : "documentos cargados"
                } en el sistema.`
              : "Repositorio único del SGI. Cada documento es trazable, versionado y auditable."}
          </p>
        </div>

        {documentos.length > 0 && (
          <Link
            href="/documentos/nuevo"
            className={cn(buttonVariants({ variant: "default" }), "shrink-0")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cargar documento
          </Link>
        )}
      </header>

      {/* Listado o empty state */}
      {documentos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card">
          <DocumentEmptyState />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Header de la lista */}
          <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/30 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <span className="w-4">{/* Estado */}</span>
            <span className="w-32">Código</span>
            <span className="flex-1">Documento</span>
            <span className="hidden md:block max-w-md shrink-0">
              Tipo · Proceso · Normas
            </span>
            <span className="hidden lg:block w-24 text-right shrink-0">
              Actualizado
            </span>
            <span className="w-4">{/* Chevron */}</span>
          </div>

          {/* Filas */}
          <div>
            {documentos.map((doc) => (
              <DocumentRow key={doc.id} documento={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Leyenda de estados */}
      {documentos.length > 0 && (
        <footer className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Leyenda de estados:</span>
          </div>
          <LegendItem color="bg-stone-400" label="Borrador" />
          <LegendItem color="bg-blue-400" label="Confeccionado" />
          <LegendItem color="bg-amber-400" label="Pendiente aprobación" />
          <LegendItem color="bg-emerald-500" label="Aprobado" />
          <LegendItem color="bg-rose-500" label="Rechazado" />
          <LegendItem color="bg-stone-300" label="Obsoleto" />
        </footer>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
