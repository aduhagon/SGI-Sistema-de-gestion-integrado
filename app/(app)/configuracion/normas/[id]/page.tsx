import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BookOpen } from "lucide-react";
import { obtenerNorma, listarVersionesDeNorma } from "@/lib/api/normativa";
import { GestionVersionesNorma } from "@/components/configuracion/GestionVersionesNorma";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function NormaDetallePage({ params }: Props) {
  const norma = await obtenerNorma(params.id);
  if (!norma) notFound();

  const versiones = await listarVersionesDeNorma(params.id);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion/normas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a normas
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{norma.codigo}</span>
              {norma.ambito && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{norma.ambito}</span>}
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{norma.nombreCorto}</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{norma.nombreCompleto}</p>
      </header>

      <section>
        <h2 className="mb-4 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Versiones de la norma</h2>
        <GestionVersionesNorma normaId={norma.id} versiones={versiones} />
      </section>
    </div>
  );
}
