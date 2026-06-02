import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { obtenerDatosForm } from "@/lib/api/documentos";
import { DocumentForm } from "@/components/documentos/DocumentForm";

export default async function NuevoDocumentoPage() {
  const { tipos, procesos, normas, paises } = await obtenerDatosForm();

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al listado de documentos
        </Link>
      </nav>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Nuevo documento
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          Cargar documento al SGI
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Completá la clasificación del documento; el código se genera automáticamente
          según la nomenclatura formal de MSU. Después indicá título, normas y subí el archivo.
        </p>
      </header>

      <DocumentForm tipos={tipos} procesos={procesos} normas={normas} paises={paises} />
    </div>
  );
}
