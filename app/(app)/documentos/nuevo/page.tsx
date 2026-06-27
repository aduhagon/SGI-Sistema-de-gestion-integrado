import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { obtenerDatosForm } from "@/lib/api/documentos";
import { DocumentForm } from "@/components/documentos/DocumentForm";

export default async function NuevoDocumentoPage() {
  const { tipos, procesos, normas, paises } = await obtenerDatosForm();

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-6 lg:p-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al listado de documentos
        </Link>
      </nav>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
          Nuevo documento
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mb-1.5">
          Cargar documento al SGI
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          El código se genera automáticamente según la nomenclatura formal de MSU.
        </p>
      </header>

      <DocumentForm tipos={tipos} procesos={procesos} normas={normas} paises={paises} />
    </div>
  );
}
