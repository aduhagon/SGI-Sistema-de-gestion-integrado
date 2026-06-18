import Link from "next/link";
import {
  Users, Network, FileType, BookOpen, Building, MapPin,
  UserCheck, Archive, ChevronRight, Settings, Briefcase, ShieldCheck, FileClock,
} from "lucide-react";
import { obtenerConteosConfig } from "@/lib/api/configuracion";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const c = await obtenerConteosConfig();

  const secciones = [
    { href: "/configuracion/areas", icon: Building, label: "Áreas", desc: "Unidades organizativas de la empresa.", conteo: c.areas, disponible: true },
    { href: "/configuracion/sedes", icon: MapPin, label: "Sedes", desc: "Ubicaciones físicas: plantas, oficinas, campos.", conteo: c.sedes, disponible: true },
    { href: "/configuracion/puestos", icon: Briefcase, label: "Puestos", desc: "Cargos formales (Jefe de Calidad, etc.) con roles en procesos.", conteo: c.puestos, disponible: true },
    { href: "/configuracion/personas", icon: Users, label: "Personas", desc: "Padrón de personas, su área y su historial de puestos.", conteo: c.usuarios, disponible: true },
    { href: "/configuracion/usuarios", icon: ShieldCheck, label: "Usuarios y roles globales", desc: "Asignar y revocar el acceso transversal al sistema (admin, auditor, etc.).", conteo: c.usuarios, disponible: true },
    { href: "/configuracion/participacion", icon: UserCheck, label: "Participación en procesos", desc: "Quién es elaborador, aprobador o lector en cada proceso.", conteo: c.participaciones, disponible: true },
    { href: "/configuracion/procesos", icon: Network, label: "Procesos", desc: "Mapa de procesos del SGI.", conteo: c.procesos, disponible: true },
    { href: "/configuracion/tipos", icon: FileType, label: "Tipos documentales", desc: "Políticas, manuales, procedimientos, registros.", conteo: c.tipos, disponible: true },
    { href: "/configuracion/normas", icon: BookOpen, label: "Normas", desc: "Normas certificadas y sus versiones.", conteo: c.normas, disponible: true },
    { href: "/configuracion/retencion", icon: Archive, label: "Políticas de retención", desc: "Cuánto se conserva cada tipo de información.", conteo: c.politicas, disponible: true },
    { href: "/configuracion/auditoria", icon: FileClock, label: "Registro de auditoría", desc: "Bitácora inmutable de toda la actividad del sistema, con verificación de integridad.", conteo: undefined, disponible: true },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />Administración
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Configuración</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Panel de administración del SGI: catálogos maestros, personas y reglas que dan
          estructura al sistema. Estas tablas alimentan los formularios y los flujos de todo el sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {secciones.map((s) => {
          const Icon = s.icon;
          const contenido = (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{s.label}</h2>
                  {s.conteo !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.conteo}</span>}
                  {!s.disponible && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Próximamente</span>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
              {s.disponible && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </>
          );

          return s.disponible ? (
            <Link key={s.label} href={s.href} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
              {contenido}
            </Link>
          ) : (
            <div key={s.label} className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-card/50 p-4 opacity-75">
              {contenido}
            </div>
          );
        })}
      </div>
    </div>
  );
}
