import Link from "next/link";
import { Plus, FileText, FolderTree } from "lucide-react";
import { listarDocumentos, obtenerDatosForm } from "@/lib/api/documentos";
import { GrillaDocumentosSeleccionable } from "@/components/documentos/GrillaDocumentosSeleccionable";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { DocumentEmptyState } from "@/components/documentos/DocumentEmptyState";
import { DocumentFilters } from "@/components/documentos/DocumentFilters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: {
    q?: string;
    estado?: string;
    proceso?: string;
    tipo?: string;
  };
};

export default async function DocumentosPage({ searchParams }: Props) {
  const [documentos, datosForm, perfil] = await Promise.all([
    listarDocumentos({
      texto: searchParams.q,
      estado: searchParams.estado,
      procesoId: searchParams.proceso,
      tipoId: searchParams.tipo,
    }),
    obtenerDatosForm(),
    obtenerPerfilMenu(),
  ]);

  const procesosOpc = datosForm.procesos.map((p: any) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
  }));
  const tiposOpc = datosForm.tipos.map((t: any) => ({
    id: t.id,
    codigo: t.codigo,
    nombre: t.nombre,
  }));

  const hayFiltros =
    !!searchParams.q ||
    !!searchParams.estado ||
    !!searchParams.proceso ||
    !!searchParams.tipo;

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
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
                  documentos.length === 1 ? "documento" : "documentos"
                }${hayFiltros ? " (filtrados)" : " en el sistema"}.`
              : hayFiltros
                ? "Ningún documento coincide con los filtros."
                : "Repositorio único del SGI. Cada documento es trazable, versionado y auditable."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/documentos/maestro"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FolderTree className="h-4 w-4" aria-hidden="true" />
            Listado maestro
          </Link>
          <Link
            href="/documentos/nuevo"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cargar documento
          </Link>
        </div>
      </header>

      <DocumentFilters procesos={procesosOpc} tipos={tiposOpc} />

      {documentos.length === 0 ? (
        hayFiltros ? (
          <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Sin resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Probá ajustar o limpiar los filtros.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card">
            <DocumentEmptyState />
          </div>
        )
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <GrillaDocumentosSeleccionable
            documentos={documentos}
            puedeObsoletar={perfil.esGestor}
          />
        </div>
      )}

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
