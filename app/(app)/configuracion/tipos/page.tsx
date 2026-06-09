import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarTiposDocumentales } from "@/lib/api/configuracion";
import { GestionTiposDocumentales } from "@/components/configuracion/GestionTiposDocumentales";

export const dynamic = "force-dynamic";

export default async function TiposPage() {
  const tipos = await listarTiposDocumentales();
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Catálogos</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Tipos documentales</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Las clases de documentos del SGI (políticas, manuales, procedimientos, registros, formatos).
          Cada tipo define su comportamiento: si requiere aprobación, acuse de lectura, y los valores
          por defecto al crear un documento de ese tipo.
        </p>
      </header>
      <GestionTiposDocumentales tipos={tipos} />
    </div>
  );
}
