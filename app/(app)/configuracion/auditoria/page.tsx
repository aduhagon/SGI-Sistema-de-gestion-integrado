import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerResumen } from "@/lib/api/auditoria";
import VisorAuditoria from "@/components/configuracion/VisorAuditoria";

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
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          No se pudo cargar el resumen de auditoría: {resumen.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Volver a configuración
        </Link>
      </nav>
      <header className="mb-2">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Configuración · Auditoría
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Registro de auditoría
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Bitácora completa de la actividad del sistema. Cada evento queda registrado
          de forma inmutable, encadenado por hash. Filtrá por fecha, usuario, acción o
          entidad, y verificá la integridad de la cadena en cualquier momento.
        </p>
      </header>

      <VisorAuditoria resumenInicial={resumen} />
    </div>
  );
}
