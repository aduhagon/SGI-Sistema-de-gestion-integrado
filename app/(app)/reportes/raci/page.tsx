import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerRaciPuestoProceso, obtenerRaciPuestoDocumento } from "@/lib/api/raci";
import { ReporteRaci } from "@/components/reportes/ReporteRaci";

export const dynamic = "force-dynamic";

export default async function ReporteRaciPage() {
  const supabase = createClient();

  // Guardia: solo admin del SGI (admin, responsable del SGI o superadmin).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: esAdmin }, { data: esResponsableSgi }, { data: esSuperadmin }] = await Promise.all([
    supabase.rpc("fn_usuario_es_admin"),
    supabase.rpc("fn_usuario_tiene_rol_global", { codigo_rol: "responsable_sgi" }),
    supabase.rpc("fn_es_superadmin"),
  ]);

  const puedeVer = Boolean(esAdmin) || Boolean(esResponsableSgi) || Boolean(esSuperadmin);
  if (!puedeVer) redirect("/dashboard");

  const [porProceso, porDocumento] = await Promise.all([
    obtenerRaciPuestoProceso(),
    obtenerRaciPuestoDocumento(),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-6 lg:p-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </nav>

      <header className="mb-6">
        <p className="mb-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Reporte · solo administración del SGI
        </p>
        <h1 className="mb-1.5 font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
          Matriz RACI
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Responsabilidades de cada puesto sobre los procesos y los documentos del SGI.
          A = aprueba · R = ejecuta · I = informado.
        </p>
      </header>

      <ReporteRaci porProceso={porProceso} porDocumento={porDocumento} />
    </div>
  );
}
