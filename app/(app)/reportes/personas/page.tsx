import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerPersonasParaPerfil } from "@/lib/api/perfil-persona";
import { PerfilPersona } from "@/components/reportes/PerfilPersona";

export const dynamic = "force-dynamic";

export default async function PerfilPersonaPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: esAdmin }, { data: esResponsableSgi }, { data: esSuperadmin }] = await Promise.all([
    supabase.rpc("fn_usuario_es_admin"),
    supabase.rpc("fn_usuario_tiene_rol_global", { codigo_rol: "responsable_sgi" }),
    supabase.rpc("fn_es_superadmin"),
  ]);
  if (!(Boolean(esAdmin) || Boolean(esResponsableSgi) || Boolean(esSuperadmin))) redirect("/dashboard");

  const personas = await obtenerPersonasParaPerfil();

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
          Perfil por persona
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Qué responsabilidades tiene cada persona, consolidando todos los puestos que ocupa.
          A = aprueba · R = ejecuta · I = informado.
        </p>
      </header>

      <PerfilPersona personas={personas} />
    </div>
  );
}
