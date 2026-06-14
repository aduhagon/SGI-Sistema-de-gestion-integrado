import Link from "next/link";
import { ChevronLeft, FolderTree } from "lucide-react";
import { obtenerArbolMaestro } from "@/lib/api/arbolMaestro";
import { ArbolMaestro } from "@/components/documentos/ArbolMaestro";

export const dynamic = "force-dynamic";

export default async function ListadoMaestroPage() {
  const { procesos, sinProceso } = await obtenerArbolMaestro();

  const totalDocs =
    procesos.reduce((acc, p) => acc + p.totalDocumentos, 0) + sinProceso.length;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al listado de documentos
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Sistema de Gestión Integrado
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2 flex items-center gap-3">
          <FolderTree className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          Listado maestro
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Estructura documental completa, organizada por proceso y jerarquía
          (documentos padre y sus documentos dependientes). {totalDocs}{" "}
          {totalDocs === 1 ? "documento" : "documentos"} en total.
        </p>
      </header>

      <ArbolMaestro procesos={procesos} sinProceso={sinProceso} />
    </div>
  );
}
