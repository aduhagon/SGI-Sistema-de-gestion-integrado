import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarPersonas } from "@/lib/api/personas";
import { listarAreasParaSelector } from "@/lib/api/configuracion";
import { GestionPersonas } from "@/components/configuracion/GestionPersonas";

export const dynamic = "force-dynamic";

type Props = { searchParams: { ver?: string } };

export default async function PersonasPage({ searchParams }: Props) {
  const incluirInactivas = searchParams.ver === "todas";
  const [personas, areas] = await Promise.all([
    listarPersonas(incluirInactivas),
    listarAreasParaSelector(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Personas</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Personas</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Padrón de personas del sistema. Cada una puede pertenecer a un área, ocupar
          puestos a lo largo del tiempo y tener (o no) cuenta de usuario.
        </p>
      </header>
      <GestionPersonas personas={personas} areas={areas} incluyeInactivas={incluirInactivas} />
    </div>
  );
}
