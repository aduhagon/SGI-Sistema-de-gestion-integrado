import { Suspense } from "react";
import { GestionControles } from "@/components/controles/GestionControles";
import { listarControles, obtenerOpcionesControl } from "@/lib/api/controles";

export const dynamic = "force-dynamic";

export default async function ControlesPage() {
  const [controles, opciones] = await Promise.all([
    listarControles(),
    obtenerOpcionesControl(),
  ]);

  const vencidos = controles.filter(
    (control) => control.estado === "activo" && control.proximaEjecucion && control.proximaEjecucion < new Date().toISOString().slice(0, 10),
  ).length;
  const sinResponsable = controles.filter((control) => !control.responsablePuestoId).length;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">SGI · Operación y eficacia</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Controles</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Controles reutilizables por proceso, conectados con riesgos, requisitos, documentos e indicadores. Cada ejecución conserva su evidencia y programa el siguiente vencimiento.
        </p>
        {(vencidos > 0 || sinResponsable > 0) && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {vencidos > 0 && <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">{vencidos} vencido{vencidos === 1 ? "" : "s"}</span>}
            {sinResponsable > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">{sinResponsable} sin responsable</span>}
          </div>
        )}
      </header>
      <Suspense fallback={null}>
        <GestionControles controles={controles} opciones={opciones} />
      </Suspense>
    </div>
  );
}
