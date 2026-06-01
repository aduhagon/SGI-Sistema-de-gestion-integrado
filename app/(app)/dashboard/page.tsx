import {
  FileText,
  CheckSquare,
  PenSquare,
  AlertOctagon,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dashboard inicial del SGI.
 *
 * Server Component que carga el contexto del usuario y catálogos básicos
 * para mostrar una vista de estado inicial.
 *
 * Las próximas iteraciones van a poblar los widgets con datos reales
 * (aprobaciones pendientes, NCs vencidas, etc.) a medida que armemos
 * cada módulo.
 */
export default async function DashboardPage() {
  const supabase = createClient();

  // Datos reales del catálogo para validar conexión
  const [{ count: procesosCount }, { count: normasCount }, { count: tiposCount }, { data: user }] =
    await Promise.all([
      supabase.from("procesos").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("normas").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("tipos_documentales").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.auth.getUser(),
    ]);

  const greeting = getGreeting();
  const userName = user.user?.email?.split("@")[0] ?? "Usuario";

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
      {/* Encabezado de bienvenida */}
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2">
          {greeting}, <span className="text-primary">{userName}</span>.
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Bienvenido al Sistema de Gestión Documental Multinorma de MSU. Acá
          vas a encontrar tu trabajo del día y el estado general del SGI.
        </p>
      </header>

      {/* Widgets de actividad pendiente */}
      <section aria-labelledby="actividad-heading" className="mb-12">
        <h2
          id="actividad-heading"
          className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4"
        >
          Mi actividad pendiente
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PendingWidget
            label="Aprobaciones N1/N2"
            value={0}
            icon={CheckSquare}
            href="/aprobaciones"
            accentClass="text-primary"
          />
          <PendingWidget
            label="Acuses pendientes"
            value={0}
            icon={PenSquare}
            href="/acuses"
            accentClass="text-accent"
          />
          <PendingWidget
            label="Mis documentos"
            value={0}
            icon={FileText}
            href="/documentos"
            accentClass="text-foreground"
          />
          <PendingWidget
            label="NCs asignadas"
            value={0}
            icon={AlertOctagon}
            href="/ncs"
            accentClass="text-destructive"
          />
        </div>
      </section>

      {/* Estado general del SGI */}
      <section aria-labelledby="sgi-heading" className="mb-12">
        <h2
          id="sgi-heading"
          className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4"
        >
          Estado del Sistema de Gestión Integrado
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SystemStat
            label="Procesos del SGI"
            value={procesosCount ?? 0}
            description="Estratégicos, operativos y de apoyo"
          />
          <SystemStat
            label="Normas vigentes"
            value={normasCount ?? 0}
            description="Marco normativo aplicable a MSU"
          />
          <SystemStat
            label="Tipos documentales"
            value={tiposCount ?? 0}
            description="Categorías de documentos del SGI"
          />
        </div>
      </section>

      {/* Mensaje contextual */}
      <Card className="bg-primary/[0.03] border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">
            Sistema en construcción · Fase 1B
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Estás viendo la primera versión del frontend del SGI. Las pantallas
            de documentos, procesos, aprobaciones y auditorías se van a
            habilitar en las próximas semanas. La base de datos ya está
            completamente operativa con sus 39 tablas, 117 policies de
            seguridad y 64 triggers automáticos.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function PendingWidget({
  label,
  value,
  icon: Icon,
  href,
  accentClass,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accentClass: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className={`h-5 w-5 ${accentClass}`} aria-hidden="true" />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className="font-serif text-3xl font-semibold tracking-tight mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

function SystemStat({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="font-serif text-4xl font-semibold tracking-tight mb-1 text-primary">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
