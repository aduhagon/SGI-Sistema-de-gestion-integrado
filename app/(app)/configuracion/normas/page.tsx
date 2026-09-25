import Link from "next/link";
import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { listarNormasCatalogo } from "@/lib/api/configuracion";
import { GestionNormas } from "@/components/configuracion/GestionNormas";
import { PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

export default async function NormasConfigPage() {
  const normas = await listarNormasCatalogo();
  const certificaciones = normas.filter((n) => !n.ambito?.startsWith("Marco legal"));
  const marcoLegal = normas.filter((n) => n.ambito?.startsWith("Marco legal"));
  return (
    <PageContainer width="standard">
      <nav aria-label="Breadcrumb" className="mb-5">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <PageHeader
        eyebrow="Configuración · Cumplimiento"
        title="Normas y marco legal"
        description="Administrá por separado las certificaciones del SGI y las leyes, decretos y resoluciones que originan obligaciones legales."
      />
      <section className="mb-10 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Certificaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">Normas auditables con versiones, cláusulas y matrices de cumplimiento.</p>
        </div>
        <GestionNormas normas={certificaciones} />
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Marco legal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Leyes, decretos y resoluciones con sus relaciones y obligaciones derivadas.</p>
        </div>
        <ul className="divide-y overflow-hidden rounded-xl border border-border bg-card">
          {marcoLegal.map((n) => (
            <li key={n.id}>
              <Link className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50" href={`/configuracion/normas/${n.id}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Scale className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{n.nombreCorto}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{n.codigo}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
