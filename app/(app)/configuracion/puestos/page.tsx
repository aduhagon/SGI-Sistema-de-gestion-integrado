import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarPuestos, listarAreasParaSelector } from "@/lib/api/configuracion";
import { GestionPuestos } from "@/components/configuracion/GestionPuestos";

export const dynamic = "force-dynamic";

export default async function PuestosPage() {
  const [puestos, areas] = await Promise.all([listarPuestos(), listarAreasParaSelector()]);
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Catálogos</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Puestos</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Cargos formales de la organización. Un puesto se define una vez, tiene roles en
          los procesos y puede ser ocupado por una o varias personas.
        </p>
      </header>
      <GestionPuestos puestos={puestos} areas={areas} />
    </div>
  );
}
