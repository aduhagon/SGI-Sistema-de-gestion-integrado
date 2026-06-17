import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  listarUsuariosConRoles,
  listarRolesGlobales,
} from "@/lib/api/rolesGlobales";
import GestionRolesGlobales from "@/components/configuracion/GestionRolesGlobales";

export const dynamic = "force-dynamic";

export default async function UsuariosRolesPage() {
  const [usuarios, roles] = await Promise.all([
    listarUsuariosConRoles(),
    listarRolesGlobales(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a configuración
        </Link>
      </nav>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Configuración · Accesos
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Usuarios y roles globales
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Asigná o revocá los roles globales que definen el acceso transversal al
          sistema (administración, responsable del SGI, auditor, etc.). Cada cambio
          se versiona por vigencia y queda registrado en la auditoría con su motivo.
        </p>
      </header>

      <GestionRolesGlobales usuarios={usuarios} roles={roles} />
    </div>
  );
}
