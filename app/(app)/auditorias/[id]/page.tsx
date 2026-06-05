import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, Calendar, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { creada?: string };
};

const TIPO_LABEL: Record<string, string> = {
  interna: "Interna", externa: "Externa", certificacion: "Certificación",
  vigilancia: "Vigilancia", recertificacion: "Recertificación",
};
const ESTADO_LABEL: Record<string, string> = {
  planificada: "Planificada", en_curso: "En curso", cerrada: "Cerrada", cancelada: "Cancelada",
};

export default async function AuditoriaDetallePage({ params, searchParams }: Props) {
  const supabase = createClient();

  const { data: aud, error } = await supabase
    .from("auditorias")
    .select(
      `id, codigo, titulo, descripcion, tipo, estado, fecha_planificada,
       entidad_certificadora, objetivo, alcance_general, criterios,
       auditoria_alcance (
         id,
         version_norma:versiones_norma!auditoria_alcance_version_norma_id_fkey (
           version, normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto)
         ),
         proceso:procesos!auditoria_alcance_proceso_id_fkey (codigo, nombre)
       )`,
    )
    .eq("id", params.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !aud) notFound();

  const alcance = ((aud as any).auditoria_alcance ?? []) as Array<{
    id: string;
    version_norma: { version: string; normas: { codigo: string; nombre_corto: string } | null } | null;
    proceso: { codigo: string; nombre: string } | null;
  }>;

  const normas = alcance.filter((a) => a.version_norma);
  const procesos = alcance.filter((a) => a.proceso);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      {searchParams.creada === "1" && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Auditoría creada correctamente. Próximamente vas a poder sumar el equipo y registrar hallazgos.</span>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/auditorias" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a auditorías
        </Link>
      </nav>

      <header className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">{aud.codigo}</Badge>
          <span className="text-xs text-muted-foreground">{TIPO_LABEL[aud.tipo] ?? aud.tipo}</span>
          <Badge variant="muted">{ESTADO_LABEL[aud.estado] ?? aud.estado}</Badge>
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight leading-tight">
          {aud.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {new Date(aud.fecha_planificada).toLocaleDateString("es-AR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
          {aud.entidad_certificadora && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {aud.entidad_certificadora}
              </span>
            </>
          )}
        </div>
      </header>

      {aud.objetivo && (
        <section className="mb-8">
          <h2 className="mb-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Objetivo</h2>
          <p className="text-sm leading-relaxed text-foreground">{aud.objetivo}</p>
        </section>
      )}

      <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Normas en alcance
          </h2>
          {normas.length > 0 ? (
            <div className="space-y-2">
              {normas.map((n) => (
                <div key={n.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <Badge variant="outline" className="font-mono">{n.version_norma?.normas?.codigo}</Badge>
                  <span>{n.version_norma?.normas?.nombre_corto}</span>
                  <span className="text-xs text-muted-foreground">{n.version_norma?.version}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin normas específicas.</p>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Procesos en alcance
          </h2>
          {procesos.length > 0 ? (
            <div className="space-y-2">
              {procesos.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{p.proceso?.codigo}</span>
                  <span>{p.proceso?.nombre}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin procesos específicos.</p>
          )}
        </div>
      </section>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Hallazgos y equipo auditor</CardTitle>
          <CardDescription className="leading-relaxed">
            El registro de hallazgos (no conformidades, observaciones, oportunidades de
            mejora) y la asignación del equipo auditor se incorporan en la próxima
            iteración del módulo de auditorías.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
