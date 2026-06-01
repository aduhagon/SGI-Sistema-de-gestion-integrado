import Link from "next/link";
import { FileText, ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DocumentoNoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-12 mt-12">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Documento no encontrado
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight mb-3">
          No encontramos este documento
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
          El identificador que ingresaste no corresponde a ningún documento del SGI,
          o el documento fue eliminado.
        </p>

        <Link
          href="/documentos"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Ir al listado de documentos
        </Link>
      </div>
    </div>
  );
}
