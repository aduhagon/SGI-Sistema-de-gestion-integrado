import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarNormasCatalogo } from "@/lib/api/configuracion";
import { GestionNormas } from "@/components/configuracion/GestionNormas";

export const dynamic = "force-dynamic";

export default async function NormasConfigPage() {
  const normas = await listarNormasCatalogo();
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Catálogos</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Normas</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Las normas y esquemas de certificación del SGI multinorma (ISO 9001, ISO 14001, ISO 45001,
          BRCGS, GlobalGAP, BPA). Cada norma tiene luego sus versiones y, dentro de cada versión, sus requisitos.
        </p>
      </header>
      <section className="mb-10 space-y-4">
        <h2 className="text-xl font-semibold">Certificaciones</h2>
        <GestionNormas normas={normas.filter((n) => !n.ambito?.startsWith("Marco legal"))} />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Marco legal</h2>
        <p className="text-sm text-muted-foreground">Leyes, decretos y resoluciones. Abrí una ficha para gestionar sus relaciones.</p>
        <ul className="divide-y rounded-lg border">
          {normas.filter((n) => n.ambito?.startsWith("Marco legal")).map((n) => (
            <li key={n.id}><Link className="block px-4 py-3 text-primary hover:underline" href={`/configuracion/normas/${n.id}`}>{n.nombreCorto}</Link></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
