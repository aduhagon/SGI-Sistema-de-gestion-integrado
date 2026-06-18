import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerNCsOperativas } from "@/lib/api/ncReportes";
import { ReporteNCOperativo } from "@/components/ncs/ReporteNCOperativo";

export const dynamic = "force-dynamic";

export default async function ReporteNCPage() {
  const supabase = createClient();
  const { data: autorizado } = await supabase.rpc("fn_usuario_es_auditor_o_sgi");

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los reportes de gestión son para administradores, responsables del SGI y auditores.
          </p>
          <Link href="/ncs" className="mt-4 inline-block text-sm text-primary hover:underline">
            Volver a no conformidades
          </Link>
        </div>
      </div>
    );
  }

  const resultado = await obtenerNCsOperativas();

  if ("error" in resultado) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          No se pudo cargar el reporte: {resultado.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/ncs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Volver a no conformidades
        </Link>
      </nav>

      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          No conformidades · Reporte
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Listado por proceso, gerencia y requisito
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Vista operativa de todas las no conformidades con su estado actual. Cambiá el
          agrupamiento y filtrá por estado. Cada fila lleva al detalle de la NC.
        </p>
      </header>

      <ReporteNCOperativo ncs={resultado} />
    </div>
  );
}
