import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarSedes } from "@/lib/api/configuracion";
import { GestionSedes } from "@/components/configuracion/GestionSedes";

export const dynamic = "force-dynamic";

export default async function SedesPage() {
  const sedes = await listarSedes();
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Catálogos</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Sedes</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Ubicaciones físicas de MSU. Se usan para indicar dónde aplica cada documento.
        </p>
      </header>
      <GestionSedes sedes={sedes} />
    </div>
  );
}
