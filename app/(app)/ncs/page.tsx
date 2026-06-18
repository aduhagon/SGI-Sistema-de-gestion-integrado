import Link from "next/link";
import { Plus, AlertOctagon, BarChart3 } from "lucide-react";
import { obtenerNCs } from "@/lib/api/ncs";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { obtenerTableroNC } from "@/lib/api/tableroNC";
import { resolverRango, etiquetaRango, type PresetRango } from "@/lib/api/rangoFechasNC";
import { PanelTableroNC } from "@/components/tablero-nc/PanelTableroNC";
import { BotonTablero } from "@/components/tablero-nc/BotonTablero";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ESTADO_META: Record<string, { label: string; color: string }> = {
  abierta: { label: "Abierta", color: "#dc2626" },
  en_analisis: { label: "En análisis", color: "#d97706" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrada: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
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
        <div className="overflow-hidden rounded-lg border border-border">
          {/* Encabezado de columnas (solo desktop) */}
          <div className="hidden items-center gap-3 bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex">
            <span className="w-28 shrink-0">Código</span>
            <span className="flex-1">Título</span>
            <span className="w-40 shrink-0">Proceso</span>
            <span className="w-24 shrink-0">Estado</span>
            <span className="w-20 shrink-0 text-right">Abierta</span>
          </div>

          {ncs.map((nc) => {
            const meta = ESTADO_META[nc.estado] ?? ESTADO_META.abierta;
            const vencida = nc.fechaLimiteCierre && new Date(nc.fechaLimiteCierre) < new Date() && nc.estado !== "cerrada";
            const fecha = new Date(nc.fechaApertura).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
            return (
              <Link
                key={nc.id}
                href={`/ncs/${nc.id}`}
                className="flex flex-col gap-1 border-t border-border px-4 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3 sm:py-2"
              >
                {/* Código + punto de estado */}
                <span className="flex w-28 shrink-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
                  <span className="font-mono text-xs text-muted-foreground">{nc.codigo}</span>
                </span>

                {/* Título (+ vencida) */}
                <span className="flex-1 truncate text-sm">
                  {nc.titulo}
                  {vencida && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
                </span>

                {/* Proceso */}
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
                  {nc.procesoNombre ?? <span className="text-muted-foreground/50">—</span>}
                </span>

                {/* Estado */}
                <span className="flex w-24 shrink-0 items-center gap-1.5">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                </span>

                {/* Fecha */}
                <span className="w-20 shrink-0 text-xs text-muted-foreground sm:text-right">{fecha}</span>
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
