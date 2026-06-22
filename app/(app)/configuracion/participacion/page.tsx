import Link from "next/link";
import { ChevronLeft, Info, Users } from "lucide-react";
import { listarParticipacionesVigentes } from "@/lib/api/participaciones";

export const dynamic = "force-dynamic";

const ROL_ETIQUETA: Record<string, string> = {
  responsable_proceso: "Responsable del proceso",
  elaborador: "Elaborador",
  aprobador_n1: "Aprobador N1",
  aprobador_n2: "Aprobador N2",
  lector: "Lector",
};

const BANDA_ETIQUETA: Record<string, string> = {
  estrategico: "Estratégico",
  operativo: "Operativo",
  apoyo: "Apoyo",
};

export default async function ParticipacionPage() {
  const participaciones = await listarParticipacionesVigentes();

  // Agrupar por proceso.
  const porProceso = new Map<string, { nombre: string; tipo: string; filas: typeof participaciones }>();
  for (const p of participaciones) {
    if (!porProceso.has(p.procesoId)) {
      porProceso.set(p.procesoId, { nombre: p.procesoNombre, tipo: p.procesoTipo, filas: [] });
    }
    porProceso.get(p.procesoId)!.filas.push(p);
  }
  const grupos = Array.from(porProceso.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver a configuración
        </Link>
      </nav>
      <header className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración · Participación</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Participación en procesos</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Quién cumple cada rol en cada proceso, según las asignaciones vigentes. Esta es una vista
          de consulta: la participación se deriva de los puestos (qué procesos tiene cada puesto y qué persona lo ocupa).
        </p>
      </header>

      <div className="mb-8 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Para cambiar quién participa, asigná o quitá la persona del puesto correspondiente, o ajustá qué procesos
          tiene ese puesto (en Configuración → Puestos). Los cambios se reflejan acá automáticamente.
        </span>
      </div>

      {grupos.length > 0 ? (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.nombre}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-medium">{g.nombre}</h3>
                {g.tipo && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{BANDA_ETIQUETA[g.tipo] ?? g.tipo}</span>}
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {g.filas
                      .sort((a, b) => a.rol.localeCompare(b.rol))
                      .map((f) => (
                        <tr key={f.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-medium">{f.usuarioNombre}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{ROL_ETIQUETA[f.rol] ?? f.rol}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Users className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay participaciones vigentes</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Cuando asignes personas a puestos con roles en procesos, aparecerán acá.
          </p>
        </div>
      )}
    </div>
  );
}
