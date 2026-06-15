import Link from "next/link";
import { ChevronLeft, AlertOctagon } from "lucide-react";
import { obtenerTableroNC } from "@/lib/api/tableroNC";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { EvolucionNC } from "@/components/tablero-nc/EvolucionNC";
import { CortesNC } from "@/components/tablero-nc/CortesNC";

export const dynamic = "force-dynamic";

export default async function TableroNCPage() {
  const perfil = await obtenerPerfilMenu();

  if (!perfil.esGestor) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Este tablero es para administradores del SGI.
          </p>
          <Link href="/ncs" className="mt-4 inline-block text-sm text-primary hover:underline">
            Ir a no conformidades
          </Link>
        </div>
      </div>
    );
  }

  const t = await obtenerTableroNC();

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/ncs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a no conformidades
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Sistema de Gestión Integrado
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2 flex items-center gap-3">
          <AlertOctagon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          Tablero de no conformidades
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Estado histórico de las no conformidades, con la evolución en el tiempo y
          tres miradas: por proceso, por norma y por severidad.
        </p>
      </header>

      {/* Consolidado */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="mt-1 font-serif text-3xl font-semibold">{t.totales.total}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Abiertas</div>
          <div className="mt-1 font-serif text-3xl font-semibold text-rose-700">{t.totales.abiertas}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Cerradas</div>
          <div className="mt-1 font-serif text-3xl font-semibold text-emerald-700">{t.totales.cerradas}</div>
        </div>
      </div>

      {/* Evolución */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Evolución mensual
        </h2>
        <EvolucionNC datos={t.evolucion} />
      </section>

      {/* Cortes */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Distribución
        </h2>
        <CortesNC porProceso={t.porProceso} porNorma={t.porNorma} porSeveridad={t.porSeveridad} />
      </section>
    </div>
  );
}
