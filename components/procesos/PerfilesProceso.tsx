import { Users, Crown, PenTool, CheckCircle2, CheckCheck, Eye } from "lucide-react";
import type { Participacion } from "@/lib/api/participaciones";
import { SeccionColapsable } from "@/components/procesos/SeccionColapsable";

type Props = {
  participaciones: Participacion[];
};

const ROLES = [
  { value: "responsable_proceso", label: "Responsable del proceso", icon: Crown, color: "#7c3aed", desc: "Dueño del proceso y su documentación." },
  { value: "elaborador", label: "Elaborador", icon: PenTool, color: "#0284c7", desc: "Redacta y versiona documentos." },
  { value: "aprobador_n1", label: "Aprobador N1", icon: CheckCircle2, color: "#d97706", desc: "Primer nivel de aprobación." },
  { value: "aprobador_n2", label: "Aprobador N2", icon: CheckCheck, color: "#059669", desc: "Segundo nivel de aprobación." },
  { value: "lector", label: "Lector", icon: Eye, color: "#6b7280", desc: "Consulta y acusa lectura." },
];

export function PerfilesProceso({ participaciones }: Props) {
  // En esta vista no se muestran los lectores: solo los roles funcionales
  // (responsable, elaborador, aprobadores).
  const participacionesVisibles = participaciones.filter(
    (p) => p.rol !== "lector",
  );

  // Agrupar participaciones por rol.
  const porRol = participacionesVisibles.reduce<Record<string, Participacion[]>>((acc, p) => {
    (acc[p.rol] ??= []).push(p);
    return acc;
  }, {});

  const sinAprobadores =
    (porRol["aprobador_n1"]?.length ?? 0) === 0 &&
    (porRol["aprobador_n2"]?.length ?? 0) === 0;

  const totalPersonas = participacionesVisibles.length;

  return (
    <SeccionColapsable
      icon={Users}
      titulo="Perfiles funcionales del proceso"
      colorIcono="#7c3aed"
      conteo={
        totalPersonas === 0
          ? "Sin perfiles funcionales asignados."
          : `${totalPersonas} ${totalPersonas === 1 ? "persona" : "personas"} en roles funcionales. La participación se deriva de los puestos.`
      }
      senalCritica={
        totalPersonas > 0 && sinAprobadores
          ? {
              texto: "Sin aprobadores",
              cls: "bg-amber-50 text-amber-700 border-amber-200",
            }
          : null
      }
      href="/configuracion/puestos"
      hrefLabel="Configurar puestos"
    >
      {participacionesVisibles.length > 0 ? (
        <div className="space-y-4 p-4">
          {ROLES.map((rol) => {
            const personas = porRol[rol.value] ?? [];
            if (personas.length === 0) return null;
            const Icon = rol.icon;
            return (
              <div key={rol.value} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${rol.color}15`, color: rol.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-sm font-medium">{rol.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{rol.desc}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {personas.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm" title={p.puestoNombre ? `Puesto: ${p.puestoNombre}` : undefined}>
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {p.usuarioNombre}
                      {p.puestoCodigo && (
                        <span className="text-xs text-muted-foreground">· {p.puestoCodigo}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <Users className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Este proceso no tiene perfiles asignados</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            La participación se configura asignando puestos al proceso (con sus roles) y personas a esos puestos,
            desde Configuración → Puestos. Sin aprobadores, los documentos de este proceso no podrán enviarse a aprobación.
          </p>
        </div>
      )}
    </SeccionColapsable>
  );
}
