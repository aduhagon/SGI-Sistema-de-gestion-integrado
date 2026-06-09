import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  listarPoliticasRetencion,
  listarTiposDocumentales,
  listarNormasCatalogo,
  listarProcesosCatalogo,
} from "@/lib/api/configuracion";
import { GestionRetencion } from "@/components/configuracion/GestionRetencion";

export const dynamic = "force-dynamic";

export default async function RetencionPage() {
  const [politicas, tipos, normas, procesos] = await Promise.all([
    listarPoliticasRetencion(),
    listarTiposDocumentales(),
    listarNormasCatalogo(),
    listarProcesosCatalogo(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Auditabilidad</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Políticas de retención</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Definen cuánto tiempo se conserva cada tipo de información (versiones obsoletas, eventos de auditoría,
          firmas, acuses) antes de poder purgarla. Son el pilar 5 de la auditabilidad ISO. Conviene definirlas
          formalmente con el Comité del SGI.
        </p>
      </header>
      <GestionRetencion
        politicas={politicas}
        tipos={tipos.map((t) => ({ id: t.id, nombre: t.nombre }))}
        normas={normas.map((n) => ({ id: n.id, nombre: n.nombreCorto }))}
        procesos={procesos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </div>
  );
}
