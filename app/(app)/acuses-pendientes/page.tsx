import Link from "next/link";
import { ChevronLeft, PenSquare } from "lucide-react";
import { obtenerAcusesPendientesPorUsuario } from "@/lib/api/acusesPendientes";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { AcusesPorUsuario } from "@/components/acuses/AcusesPorUsuario";

export const dynamic = "force-dynamic";

export default async function AcusesPendientesPage() {
  const [usuarios, perfil] = await Promise.all([
    obtenerAcusesPendientesPorUsuario(),
    obtenerPerfilMenu(),
  ]);

  // Solo gestores pueden ver esta vista de gestión.
  if (!perfil.esGestor) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta vista de gestión de acuses es para administradores del SGI.
          </p>
          <Link
            href="/acuses"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Ir a mis acuses
          </Link>
        </div>
      </div>
    );
  }

  const totalPendientes = usuarios.reduce((acc, u) => acc + u.totalPendientes, 0);
  const totalVencidos = usuarios.reduce((acc, u) => acc + u.vencidos, 0);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/acuses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a acuses
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Sistema de Gestión Integrado
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2 flex items-center gap-3">
          <PenSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          Acuses pendientes por usuario
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          {totalPendientes > 0
            ? `${totalPendientes} acuse${totalPendientes !== 1 ? "s" : ""} pendiente${
                totalPendientes !== 1 ? "s" : ""
              } de firma${
                totalVencidos > 0 ? `, ${totalVencidos} vencido${totalVencidos !== 1 ? "s" : ""}` : ""
              }. Reclamá la lectura a quien corresponda.`
            : "Estado de los acuses de lectura del personal."}
        </p>
      </header>

      <AcusesPorUsuario usuarios={usuarios} />
    </div>
  );
}
