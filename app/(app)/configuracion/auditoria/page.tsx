import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerResumen } from "@/lib/api/auditoria";
import VisorAuditoria from "@/components/configuracion/VisorAuditoria";
import { ErrorState, PageContainer, PageHeader } from "@/components/ui/page";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const supabase = createClient();

  // Mismo gate que protege las RPC: admin / responsable_sgi / auditor.
  const { data: autorizado } = await supabase.rpc("fn_usuario_es_auditor_o_sgi");

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El registro de auditoría es exclusivo de administradores, responsables del SGI y auditores.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const resumen = await obtenerResumen();
  if ("error" in resumen) {
    return (
      <PageContainer width="standard">
        <ErrorState
          title="No se pudo cargar la bitácora"
          description="No se modificó ningún registro. Podés volver a intentar o regresar a Configuración."
          detail={resumen.error}
          action={<div className="flex flex-wrap justify-center gap-2"><Link href="/configuracion/auditoria" className={cn(buttonVariants({ variant: "default" }))}>Reintentar</Link><Link href="/configuracion" className={cn(buttonVariants({ variant: "outline" }))}>Volver a configuración</Link></div>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <nav aria-label="Breadcrumb" className="mb-5">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Volver a configuración
        </Link>
      </nav>
      <PageHeader eyebrow="Configuración · Trazabilidad" title="Registro de auditoría" description={
        <>
          Bitácora completa de la actividad del sistema. Cada evento queda registrado
          de forma inmutable y encadenado por hash. Filtrá por fecha, usuario, acción o entidad.
        </>
      } />

      <VisorAuditoria resumenInicial={resumen} />
    </PageContainer>
  );
}
