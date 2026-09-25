import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BookOpen, Scale, Workflow } from "lucide-react";
import {
  obtenerNorma,
  listarVersionesDeNorma,
  listarNormasParaRelacion,
  listarRelacionesNorma,
} from "@/lib/api/normativa";
import { GestionVersionesNorma } from "@/components/configuracion/GestionVersionesNorma";
import { GestionRelacionesNorma } from "@/components/configuracion/GestionRelacionesNorma";
import { listarRequisitosLegales } from "@/lib/api/requisitos-legales";
import { PageContainer } from "@/components/ui/page";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function NormaDetallePage({ params }: Props) {
  const norma = await obtenerNorma(params.id);
  if (!norma) notFound();

  const esMarcoLegal = norma.ambito?.startsWith("Marco legal") ?? false;
  const [versiones, relaciones, normasDisponibles, todosLosRequisitos] = await Promise.all([
    listarVersionesDeNorma(params.id),
    listarRelacionesNorma(params.id),
    listarNormasParaRelacion(params.id),
    esMarcoLegal ? listarRequisitosLegales() : Promise.resolve([]),
  ]);
  const requisitos = todosLosRequisitos.filter((r) => r.normaLegalId === norma.id);
  const sinProceso = requisitos.filter((r) => r.procesos.length === 0).length;
  const sinCertificacion = requisitos.filter((r) => r.normas.length === 0).length;

  return (
    <PageContainer width="standard">
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

      {esMarcoLegal ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Requisitos legales derivados
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Obligaciones concretas identificadas para esta ley, decreto o resolución.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">{requisitos.length}</span>
          </div>

          {requisitos.length > 0 && (sinProceso > 0 || sinCertificacion > 0) && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Workflow className="h-4 w-4 shrink-0" />
                <span><strong>{sinProceso}</strong> sin proceso asignado</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Scale className="h-4 w-4 shrink-0" />
                <span><strong>{sinCertificacion}</strong> sin certificación relacionada</span>
              </div>
            </div>
          )}

          {requisitos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
              <Scale className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium">No hay requisitos derivados cargados</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border border-border">
              {requisitos.map((requisito) => (
                <article key={requisito.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{requisito.codigo}</p>
                      <h3 className="font-medium leading-snug">{requisito.titulo}</h3>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-full bg-muted px-2 py-1">{requisito.criticidad ?? "Sin criticidad"}</span>
                      <span className="rounded-full bg-muted px-2 py-1">{requisito.procesos.length} procesos</span>
                      <span className="rounded-full bg-muted px-2 py-1">{requisito.normas.length} certificaciones</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <Link
            href="/requisitos-legales"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground sm:w-auto"
          >
            Gestionar requisitos legales
          </Link>
        </section>
      ) : (
        <section>
          <h2 className="mb-4 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Versiones de la norma</h2>
          <GestionVersionesNorma normaId={norma.id} versiones={versiones} />
        </section>
      )}

      <GestionRelacionesNorma
        normaId={norma.id}
        normasDisponibles={normasDisponibles}
        relaciones={relaciones}
      />
    </PageContainer>
  );
}
