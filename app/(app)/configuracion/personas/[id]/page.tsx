import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UserCircle, Mail, Building2 } from "lucide-react";
import { obtenerPersona, obtenerHistorialPuestos } from "@/lib/api/personas";
import { Badge } from "@/components/ui/badge";
import { HistorialPuestos } from "@/components/configuracion/HistorialPuestos";
import { CrearCuentaUsuario } from "@/components/configuracion/CrearCuentaUsuario";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function PersonaDetallePage({ params }: Props) {
  const persona = await obtenerPersona(params.id);
  if (!persona) notFound();

  const historial = await obtenerHistorialPuestos(params.id);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion/personas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a personas
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <UserCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{persona.nombreCompleto}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {persona.cargo && <span>{persona.cargo}</span>}
              {!persona.activo && <Badge variant="muted">Dada de baja</Badge>}
              {persona.esExterna && <Badge variant="outline">Externa</Badge>}
              {persona.tieneUsuario ? <Badge variant="accent">Con cuenta</Badge> : <Badge variant="muted">Sin cuenta</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {persona.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{persona.email}</span>}
          {persona.areaNombre && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{persona.areaNombre}{persona.gerenciaNombre ? ` · ${persona.gerenciaNombre}` : ""}</span>}
        </div>
      </header>

      {!persona.tieneUsuario && !persona.esExterna && (
        <div className="mb-8 flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <p className="text-sm font-medium">Esta persona no tiene cuenta de acceso</p>
            <p className="text-xs text-muted-foreground">Creale una cuenta para que pueda ingresar al sistema.</p>
          </div>
          <CrearCuentaUsuario
            personaId={persona.id}
            nombreCompleto={persona.nombreCompleto}
            emailSugerido={persona.email}
            usernameSugerido={`${persona.nombre.charAt(0)}${persona.apellido}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "").slice(0, 50)}
          />
        </div>
      )}

      <section>
        <h2 className="mb-4 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Historial de puestos
        </h2>
        <HistorialPuestos historial={historial} />
      </section>
    </div>
  );
}
