import {
  FileText,
  CheckSquare,
  PenSquare,
  AlertOctagon,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuarioActualId, contarAprobacionesPendientes } from "@/lib/api/aprobaciones";
import { contarAcusesPendientes } from "@/lib/api/acuses";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: procesosCount }, { count: normasCount }, { count: tiposCount }, { data: user }] =
    await Promise.all([
      supabase.from("procesos").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("normas").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("tipos_documentales").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.auth.getUser(),
    ]);

  // Datos de actividad pendiente del usuario actual.
  const usuarioId = await obtenerUsuarioActualId();

  let aprobacionesPend = 0;
  let acusesPend = 0;
  let misDocumentos = 0;
  let ncsAsignadas = 0;

  if (usuarioId) {
    const [aprob, acuses, { count: docsCount }] = await Promise.all([
      contarAprobacionesPendientes(usuarioId).catch(() => 0),
      contarAcusesPendientes(usuarioId).catch(() => 0),
      supabase
        .from("documentos")
        .select("id", { count: "exact", head: true })
        .eq("dueno_usuario_id", usuarioId)
        .is("eliminado_en", null),
    ]);
    aprobacionesPend = aprob;
    acusesPend = acuses;
    misDocumentos = docsCount ?? 0;

    // NCs asignadas al usuario (la tabla existe; el módulo de gestión llega en Fase 3).
    const { count: ncsCount } = await supabase
      .from("no_conformidades")
      .select("id", { count: "exact", head: true })
      .eq("responsable_tratamiento_id", usuarioId)
      .is("eliminado_en", null);
    ncsAsignadas = ncsCount ?? 0;
  }

  const greeting = getGreeting();
  const userName = user.user?.email?.split("@")[0] ?? "Usuario";

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
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
            value={aprobacionesPend}
            icon={CheckSquare}
            href="/aprobaciones"
            tono="atencion"
          />
          <PendingWidget
            label="Acuses pendientes"
            value={acusesPend}
            icon={PenSquare}
            href="/acuses"
            tono="atencion"
          />
          <PendingWidget
            label="Mis documentos"
            value={misDocumentos}
            icon={FileText}
            href="/documentos"
            tono="neutro"
          />
          <PendingWidget
            label="NCs asignadas"
            value={ncsAsignadas}
            icon={AlertOctagon}
            href="/ncs"
            tono="critico"
          />
        </div>
      </section>

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

      <Card className="border-l-4 border-l-[#16367f] border-y-border border-r-border bg-[#16367f]/[0.04]">
        <CardHeader>
          <CardTitle className="text-base text-[#16367f]">
            Módulo documental y de cumplimiento operativos
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Ya están disponibles la gestión documental completa (alta, versionado,
            envío a aprobación), las bandejas de aprobación y acuses con firma
            electrónica, y la matriz de cumplimiento multinorma. Los módulos de
            auditorías y no conformidades se incorporan en la próxima fase.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

type Tono = "atencion" | "critico" | "neutro";

function PendingWidget({
  label,
  value,
  icon: Icon,
  href,
  tono,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tono: Tono;
}) {
  // "Color con intención": la tarjeta reacciona cuando hay algo pendiente.
  // En cero queda neutra y apagada; con valor toma el acento según su tono.
  const activo = value > 0;

  const estilos: Record<Tono, { card: string; icono: string; numero: string }> = {
    critico: {
      card: activo ? "border-rose-200 bg-rose-50/50 hover:border-rose-300" : "border-border bg-card hover:border-foreground/20",
      icono: activo ? "text-rose-600" : "text-muted-foreground/50",
      numero: activo ? "text-rose-700" : "text-muted-foreground/40",
    },
    atencion: {
      card: activo ? "border-amber-200 bg-amber-50/50 hover:border-amber-300" : "border-border bg-card hover:border-foreground/20",
      icono: activo ? "text-amber-600" : "text-muted-foreground/50",
      numero: activo ? "text-amber-700" : "text-muted-foreground/40",
    },
    neutro: {
      card: "border-border bg-card hover:border-foreground/20",
      icono: activo ? "text-primary" : "text-muted-foreground/50",
      numero: activo ? "text-foreground" : "text-muted-foreground/40",
    },
  };

  const e = estilos[tono];

  return (
    <Link
      href={href}
      className={`group block rounded-lg border p-5 transition-all hover:shadow-sm ${e.card}`}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className={`h-5 w-5 ${e.icono}`} aria-hidden="true" />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className={`font-serif text-3xl font-semibold tracking-tight mb-1 ${e.numero}`}>{value}</div>
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
