import Link from "next/link";
import { AlertOctagon, BarChart3, Eye } from "lucide-react";
import { obtenerNCs, obtenerHallazgosSinNC } from "@/lib/api/ncs";
import { obtenerObservaciones, contarObservacionesPendientes } from "@/lib/api/observaciones";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { obtenerTableroNC } from "@/lib/api/tableroNC";
import { resolverRango, etiquetaRango, type PresetRango } from "@/lib/api/rangoFechasNC";
import { obtenerProcesosParaAlcance } from "@/lib/api/auditorias";
import { obtenerNormasConRequisitos } from "@/lib/api/matriz";
import { obtenerRequisitosDeNorma } from "@/lib/api/coberturas";
import { PanelTableroNC } from "@/components/tablero-nc/PanelTableroNC";
import { BotonTablero } from "@/components/tablero-nc/BotonTablero";
import { BotonNuevaNC } from "@/components/ncs/BotonNuevaNC";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ESTADO_NC: Record<string, { label: string; color: string }> = {
  abierta: { label: "Abierta", color: "#dc2626" },
  en_analisis: { label: "En análisis", color: "#d97706" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrada: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
};

// Estados del seguimiento de observaciones (enum de hallazgos).
const ESTADO_OBS: Record<string, { label: string; color: string }> = {
  abierto: { label: "Abierta", color: "#dc2626" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrado: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
};

const TIPO_OBS_LABEL: Record<string, string> = {
  observacion: "Observación",
  oportunidad_mejora: "Oportunidad",
};

type Props = {
  searchParams: { vista?: string; tablero?: string; rango?: string; desde?: string; hasta?: string };
};

export default async function NCsPage({ searchParams }: Props) {
  const vista = searchParams.vista === "observaciones" ? "observaciones" : "ncs";

  const [ncs, observaciones, obsPendientes, perfil] = await Promise.all([
    obtenerNCs(),
    obtenerObservaciones(),
    contarObservacionesPendientes(),
    obtenerPerfilMenu(),
  ]);

  const tableroAbierto = perfil.esGestor && searchParams.tablero === "1" && vista === "ncs";
  let tableroDatos = null;
  let periodoLabel = "";
  if (tableroAbierto) {
    const preset = (searchParams.rango as PresetRango) ?? "todo";
    const { desde, hasta } = resolverRango(preset, searchParams.desde ?? null, searchParams.hasta ?? null);
    tableroDatos = await obtenerTableroNC({ desde, hasta });
    periodoLabel = etiquetaRango(preset, desde, hasta);
  }

  // Datos para el modal de alta de NC. Solo se cargan en la vista de NC
  // (en la pestaña de observaciones el botón no aparece).
  let datosNuevaNC: {
    procesos: Awaited<ReturnType<typeof obtenerProcesosParaAlcance>>;
    hallazgos: Awaited<ReturnType<typeof obtenerHallazgosSinNC>>;
    normas: Awaited<ReturnType<typeof obtenerNormasConRequisitos>>;
    requisitosPorNorma: Record<string, Awaited<ReturnType<typeof obtenerRequisitosDeNorma>>>;
  } | null = null;
  if (vista === "ncs") {
    const [procesos, hallazgos, normas] = await Promise.all([
      obtenerProcesosParaAlcance(),
      obtenerHallazgosSinNC(),
      obtenerNormasConRequisitos(),
    ]);
    // Cargar los requisitos de todas las normas en paralelo (antes era un
    // loop secuencial: un round-trip por norma encadenado con await).
    const requisitosPorNorma: Record<string, Awaited<ReturnType<typeof obtenerRequisitosDeNorma>>> = {};
    const requisitosResueltos = await Promise.all(
      normas.map(async (n) => [n.versionNormaId, await obtenerRequisitosDeNorma(n.versionNormaId)] as const),
    );
    for (const [versionNormaId, requisitos] of requisitosResueltos) {
      requisitosPorNorma[versionNormaId] = requisitos;
    }
    datosNuevaNC = { procesos, hallazgos, normas, requisitosPorNorma };
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Calidad · No conformidades y observaciones</p>
          <h1 className="mb-3 font-serif text-2xl sm:text-4xl font-semibold tracking-tight">
            {vista === "ncs" ? "No conformidades" : "Observaciones"}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {vista === "ncs"
              ? "Gestión de incumplimientos detectados, con análisis de causa raíz y seguimiento hasta el cierre."
              : "Hallazgos de menor severidad (observaciones y oportunidades de mejora) con seguimiento simple: responsable, acción y cierre. No requieren análisis de causa raíz."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vista === "ncs" && perfil.esGestor && <BotonTablero abierto={tableroAbierto} />}
          {vista === "ncs" && perfil.esGestor && (
            <Link href="/ncs/reportes" className={cn(buttonVariants({ variant: "outline" }))}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />Reporte
            </Link>
          )}
          {vista === "ncs" && datosNuevaNC && (
            <BotonNuevaNC
              procesos={datosNuevaNC.procesos}
              hallazgos={datosNuevaNC.hallazgos}
              normas={datosNuevaNC.normas}
              requisitosPorNorma={datosNuevaNC.requisitosPorNorma}
            />
          )}
        </div>
      </header>

      {/* Pestañas NC | Observaciones */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <Link
          href="/ncs"
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            vista === "ncs"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <AlertOctagon className="h-4 w-4" aria-hidden="true" />
          No conformidades
          {ncs.length > 0 && <span className="rounded-full bg-muted px-1.5 text-[11px]">{ncs.length}</span>}
        </Link>
        <Link
          href="/ncs?vista=observaciones"
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            vista === "observaciones"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Observaciones
          {obsPendientes > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-700">{obsPendientes}</span>
          )}
        </Link>
      </div>

      {tableroAbierto && tableroDatos && <PanelTableroNC datos={tableroDatos} periodoLabel={periodoLabel} />}

      {vista === "ncs" ? (
        <ListaNC
          ncs={ncs}
          slotNuevaNC={
            datosNuevaNC ? (
              <BotonNuevaNC
                procesos={datosNuevaNC.procesos}
                hallazgos={datosNuevaNC.hallazgos}
                normas={datosNuevaNC.normas}
                requisitosPorNorma={datosNuevaNC.requisitosPorNorma}
              />
            ) : null
          }
        />
      ) : (
        <ListaObservaciones observaciones={observaciones} />
      )}
    </div>
  );
}

function ListaNC({
  ncs,
  slotNuevaNC,
}: {
  ncs: Awaited<ReturnType<typeof obtenerNCs>>;
  slotNuevaNC?: React.ReactNode;
}) {
  if (ncs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <AlertOctagon className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">No hay no conformidades registradas</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Cuando se detecte un incumplimiento (en una auditoría, un reclamo o un control interno),
          abrí una no conformidad para gestionarla hasta su cierre.
        </p>
        <div className="mt-6">{slotNuevaNC}</div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden items-center gap-3 bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex">
        <span className="w-28 shrink-0">Código</span>
        <span className="flex-1">Título</span>
        <span className="w-40 shrink-0">Proceso</span>
        <span className="w-24 shrink-0">Estado</span>
        <span className="w-20 shrink-0 text-right">Abierta</span>
      </div>
      {ncs.map((nc) => {
        const meta = ESTADO_NC[nc.estado] ?? ESTADO_NC.abierta;
        const vencida = nc.fechaLimiteCierre && new Date(nc.fechaLimiteCierre) < new Date() && nc.estado !== "cerrada";
        const fecha = new Date(nc.fechaApertura).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
        return (
          <Link
            key={nc.id}
            href={`/ncs/${nc.id}`}
            className="flex flex-col gap-1 border-t border-border px-4 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3 sm:py-2"
          >
            <span className="flex w-28 shrink-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <span className="font-mono text-xs text-muted-foreground">{nc.codigo}</span>
            </span>
            <span className="flex-1 truncate text-sm">
              {nc.titulo}
              {vencida && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
            </span>
            <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
              {nc.procesoNombre ?? <span className="text-muted-foreground/50">—</span>}
            </span>
            <span className="flex w-24 shrink-0 items-center gap-1.5">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="w-20 shrink-0 text-xs text-muted-foreground sm:text-right">{fecha}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ListaObservaciones({ observaciones }: { observaciones: Awaited<ReturnType<typeof obtenerObservaciones>> }) {
  if (observaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <Eye className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">No hay observaciones registradas</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Las observaciones y oportunidades de mejora se registran durante las auditorías.
          Cuando existan, vas a poder darles seguimiento desde acá.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden items-center gap-3 bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex">
        <span className="w-28 shrink-0">Código</span>
        <span className="flex-1">Título</span>
        <span className="w-32 shrink-0">Responsable</span>
        <span className="w-24 shrink-0">Estado</span>
        <span className="w-20 shrink-0 text-right">Límite</span>
      </div>
      {observaciones.map((o) => {
        const meta = ESTADO_OBS[o.estado] ?? ESTADO_OBS.abierto;
        const vencida = o.fechaLimite && new Date(o.fechaLimite) < new Date() && o.estado !== "cerrado";
        const limite = o.fechaLimite
          ? new Date(o.fechaLimite).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
          : "—";
        return (
          <Link
            key={o.id}
            href={`/ncs/observacion/${o.id}`}
            className="flex flex-col gap-1 border-t border-border px-4 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3 sm:py-2"
          >
            <span className="flex w-28 shrink-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <span className="font-mono text-xs text-muted-foreground">{o.codigo}</span>
            </span>
            <span className="flex-1 truncate text-sm">
              <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {TIPO_OBS_LABEL[o.tipo] ?? o.tipo}
              </span>
              {o.titulo}
              {vencida && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
            </span>
            <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
              {o.responsableNombre ?? <span className="text-muted-foreground/50">Sin asignar</span>}
            </span>
            <span className="flex w-24 shrink-0 items-center gap-1.5">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="w-20 shrink-0 text-xs text-muted-foreground sm:text-right">{limite}</span>
          </Link>
        );
      })}
    </div>
  );
}
