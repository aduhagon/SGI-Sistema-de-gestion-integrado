import Link from "next/link";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerConfiguracion,
  obtenerModulos,
  obtenerNormasDisponibles,
} from "@/lib/api/configuracion";
import { PanelConfiguracion } from "@/components/sistema/PanelConfiguracion";

export const dynamic = "force-dynamic";

export default async function SistemaPage() {
  const supabase = createClient();

  // Verificar superadmin (la escritura igual está protegida en la base).
  const { data: esSuper } = await supabase.rpc("fn_es_superadmin");

  if (!esSuper) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La configuración del sistema es exclusiva del superadministrador.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const [config, modulos, normasDisponibles] = await Promise.all([
    obtenerConfiguracion(),
    obtenerModulos(),
    obtenerNormasDisponibles(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Superadministración
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2 flex items-center gap-3">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          Configuración del sistema
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Configuración global de la instancia: organización, módulos habilitados,
          normas y correo. Estos ajustes afectan a todo el sistema.
        </p>
      </header>

      <PanelConfiguracion
        config={config}
        modulos={modulos}
        normasDisponibles={normasDisponibles}
      />
    </div>
  );
}
