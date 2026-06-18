import Link from "next/link";
import { Plus, AlertOctagon, Calendar, Network, BarChart3 } from "lucide-react";
import { obtenerNCs } from "@/lib/api/ncs";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { obtenerTableroNC } from "@/lib/api/tableroNC";
import { resolverRango, etiquetaRango, type PresetRango } from "@/lib/api/rangoFechasNC";
import { PanelTableroNC } from "@/components/tablero-nc/PanelTableroNC";
import { BotonTablero } from "@/components/tablero-nc/BotonTablero";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ESTADO_META: Record<string, { label: string; color: string }> = {
  abierta: { label: "Abierta", color: "#dc2626" },
  en_analisis: { label: "En análisis", color: "#d97706" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrada: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
};
const SEV: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const ORIGEN: Record<string, string> = {
  auditoria_interna: "Auditoría interna", auditoria_externa: "Auditoría externa",
  reclamo_cliente: "Reclamo cliente", control_interno: "Control interno",
  proveedor: "Proveedor", accidente: "Accidente", otro: "Otro",
};

type Props = {
  searchParams: { tablero?: string; rango?: string; desde?: string; hasta?: string };
};

export default async function NCsPage({ searchParams }: Props) {
  const [ncs, perfil] = await Promise.all([obtenerNCs(), obtenerPerfilMenu()]);

  // El tablero es para gestores y se muestra solo si está desplegado (?tablero=1).
  const tableroAbierto = perfil.esGestor && searchParams.tablero === "1";

  // Resolver el rango del tablero (solo si está abierto, para no consultar de más).
  let tableroDatos = null;
  let periodoLabel = "";
  if (tableroAbierto) {
    const preset = (searchParams.rango as PresetRango) ?? "todo";
    const { desde, hasta } = resolverRango(
      preset,
      searchParams.desde ?? null,
      searchParams.hasta ?? null,
    );
    tableroDatos = await obtenerTableroNC({ desde, hasta });
    periodoLabel = etiquetaRango(preset, desde, hasta);
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Calidad · No conformidades</p>
          <h1 className="mb-3 font-serif text-2xl sm:text-4xl font-semibold tracking-tight">No conformidades</h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Gestión de incumplimientos detectados, con análisis de causa raíz y seguimiento hasta el cierre.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {perfil.esGestor && <BotonTablero abierto={tableroAbierto} />}
          {perfil.esGestor && (
            <Link href="/ncs/reportes" className={cn(buttonVariants({ variant: "outline" }))}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />Reporte
            </Link>
          )}
          <Link href="/ncs/nueva" className={cn(buttonVariants({ variant: "default" }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />Abrir no conformidad
          </Link>
        </div>
      </header>

      {/* Tablero colapsable, arriba de la lista */}
      {tableroAbierto && tableroDatos && (
        <PanelTableroNC datos={tableroDatos} periodoLabel={periodoLabel} />
      )}

      {ncs.length > 0 ? (
        <div className="space-y-3">
          {ncs.map((nc) => {
            const meta = ESTADO_META[nc.estado] ?? ESTADO_META.abierta;
            const vencida = nc.fechaLimiteCierre && new Date(nc.fechaLimiteCierre) < new Date() && nc.estado !== "cerrada";
            return (
              <Link key={nc.id} href={`/ncs/${nc.id}`} className="block rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{nc.codigo}</Badge>
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sev. {SEV[nc.severidad]}</span>
                  {vencida && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
                </div>
                <h3 className="font-medium text-foreground">{nc.titulo}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{ORIGEN[nc.origen] ?? nc.origen}</span>
                  {nc.procesoNombre && (<><span className="text-muted-foreground/40">·</span><span className="flex items-center gap-1"><Network className="h-3 w-3" aria-hidden="true" />{nc.procesoNombre}</span></>)}
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" />Abierta {new Date(nc.fechaApertura).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <AlertOctagon className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No hay no conformidades registradas</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Cuando se detecte un incumplimiento (en una auditoría, un reclamo o un control interno),
            abrí una no conformidad para gestionarla hasta su cierre.
          </p>
          <Link href="/ncs/nueva" className={cn(buttonVariants({ variant: "default" }), "mt-6")}>
            <Plus className="h-4 w-4" aria-hidden="true" />Abrir no conformidad
          </Link>
        </div>
      )}
    </div>
  );
}
