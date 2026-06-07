import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Briefcase } from "lucide-react";
import { obtenerPuesto, obtenerRolesDePuesto, obtenerProcesosParaSelector,
  obtenerPersonasDePuesto, obtenerPersonasCandidatas, obtenerGerenciasYAreas } from "@/lib/api/puestos";
import { Badge } from "@/components/ui/badge";
import { RolesPuesto } from "@/components/configuracion/RolesPuesto";
import { PersonasPuesto } from "@/components/configuracion/PersonasPuesto";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function PuestoDetallePage({ params }: Props) {
  const puesto = await obtenerPuesto(params.id);
  if (!puesto) notFound();

  const [roles, procesos, personas, candidatas, gyA] = await Promise.all([
    obtenerRolesDePuesto(params.id),
    obtenerProcesosParaSelector(),
    obtenerPersonasDePuesto(params.id),
    obtenerPersonasCandidatas(),
    obtenerGerenciasYAreas(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion/puestos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a puestos
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Briefcase className="h-5 w-5" />
          </span>
          <Badge variant="outline" className="font-mono">{puesto.codigo}</Badge>
          {puesto.areaNombre && <span className="text-sm text-muted-foreground">{puesto.areaNombre}</span>}
        </div>
        <h1 className="mb-2 font-serif text-4xl font-semibold tracking-tight">{puesto.nombre}</h1>
        {puesto.descripcion && <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{puesto.descripcion}</p>}
      </header>

      <RolesPuesto puestoId={puesto.id} roles={roles} procesos={procesos} />

      <PersonasPuesto
        puestoId={puesto.id}
        personas={personas}
        candidatas={candidatas}
        gerencias={gyA.gerencias}
        areas={gyA.areas}
      />
    </div>
  );
}
