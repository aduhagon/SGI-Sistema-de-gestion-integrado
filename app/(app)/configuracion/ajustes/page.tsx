import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { SelectorZonaHoraria } from "@/components/configuracion/SelectorZonaHoraria";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const zona = await obtenerZonaHoraria();

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <Link
        href="/configuracion"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver a configuración
      </Link>

      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          Administración
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Ajustes generales
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Parámetros globales del sistema. Estos valores afectan el
          comportamiento de todos los módulos.
        </p>
      </header>

      <div className="space-y-4">
        <SelectorZonaHoraria zonaActual={zona} />
      </div>
    </div>
  );
}
