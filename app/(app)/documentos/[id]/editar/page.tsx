import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { obtenerDocumentoParaEditar, obtenerDatosForm } from "@/lib/api/documentos";
import { EditarMetadataForm } from "@/components/documentos/EditarMetadataForm";

type Props = {
  params: { id: string };
};

/**
 * Pantalla de edición de metadata de un documento.
 *
 * Reglas ISO aplicadas:
 *   - Los campos identitarios (código, tipo, proceso) NO se pueden editar
 *   - El motivo de la edición es obligatorio
 *   - La edición no genera nueva versión (para eso existe "Nueva versión")
 *   - Si el documento está en estado aprobado, se muestra una advertencia
 */
export default async function EditarDocumentoPage({ params }: Props) {
  const [documento, { normas }] = await Promise.all([
    obtenerDocumentoParaEditar(params.id),
    obtenerDatosForm(),
  ]);

  if (!documento) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href={`/documentos/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al detalle del documento
        </Link>
      </nav>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Editar metadata
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          {documento.titulo}
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Editás los campos de catalogación del documento. Para cambiar el contenido
          (archivo), creá una <strong>nueva versión</strong> en lugar de editar acá.
        </p>
      </header>

      {/* Advertencia si está aprobado */}
      {documento.estado_actual === "aprobado" && (
        <div
          role="alert"
          className="mb-8 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-50 p-4"
        >
          <AlertTriangle
            className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1 text-sm text-amber-900">
            <strong>Atención: el documento está aprobado.</strong> Los cambios de
            metadata sobre documentos aprobados quedan registrados en el historial
            de auditoría. Si vas a hacer cambios significativos al contenido, considerá
            crear una nueva versión.
          </div>
        </div>
      )}

      <EditarMetadataForm documento={documento} normas={normas} />
    </div>
  );
}
