import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { obtenerDatosForm } from "@/lib/api/documentos";
import { DocumentForm } from "@/components/documentos/DocumentForm";

/**
 * Pantalla de creación de un documento nuevo.
 *
 * Server Component que carga los catálogos necesarios (tipos, procesos, normas)
 * desde Supabase y los pasa al componente cliente del form.
 */
export default async function NuevoDocumentoPage() {
  const { tipos, procesos, normas } = await obtenerDatosForm();

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al listado de documentos
        </Link>
      </nav>

      {/* Encabezado */}
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Nuevo documento
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          Cargar documento al SGI
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Completá la información básica del documento. Una vez creado vas a poder
          editarlo, asignar elaboradores, enviarlo a aprobación y subir versiones.
        </p>
      </header>

      <DocumentForm tipos={tipos} procesos={procesos} normas={normas} />
    </div>
  );
}
