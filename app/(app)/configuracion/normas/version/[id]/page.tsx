import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListChecks } from "lucide-react";
import { obtenerVersion, listarRequisitosDeVersion } from "@/lib/api/normativa";
import { GestionRequisitos } from "@/components/configuracion/GestionRequisitos";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function VersionDetallePage({ params }: Props) {
  const version = await obtenerVersion(params.id);
  if (!version) notFound();

  const requisitos = await listarRequisitosDeVersion(params.id);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href={`/configuracion/normas/${version.normaId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a {version.normaNombre}
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{version.normaCodigo}</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{version.normaNombre} · v{version.version}</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Requisitos de esta versión de la norma. Cada uno es una cláusula que los documentos del SGI
          pueden cubrir desde el módulo de cumplimiento.
        </p>
      </header>

      <section>
        <GestionRequisitos versionId={version.id} requisitos={requisitos} />
      </section>
    </div>
  );
}
