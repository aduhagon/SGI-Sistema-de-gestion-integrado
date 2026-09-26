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
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { estaVencida, formatearFechaCorta } from "@/lib/fechas";
import { NCFilters } from "@/components/ncs/NCFilters";
import { EmptyState } from "@/components/ui/page";

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
  searchParams: { vista?: string; tablero?: string; rango?: string; desde?: string; hasta?: string; q?: string; estado?: string };
};

export default async function NCsPage({ searchParams }: Props) {
  const vista = searchParams.vista === "observaciones" ? "observaciones" : "ncs";

  const [ncs, observaciones, obsPendientes, perfil, zona] = await Promise.all([
    obtenerNCs(),
    obtenerObservaciones(),
    contarObservacionesPendientes(),
    obtenerPerfilMenu(),
    obtenerZonaHoraria(),
  ]);
  const termino = searchParams.q?.trim().toLocaleLowerCase("es") ?? "";
  const estadoFiltro = searchParams.estado ?? "";
  const ncsVisibles = ncs.filter((nc) => {
    const coincideEstado = !estadoFiltro || nc.estado === estadoFiltro;
    const texto = `${nc.codigo} ${nc.titulo} ${nc.procesoNombre ?? ""}`.toLocaleLowerCase("es");
    return coincideEstado && (!termino || texto.includes(termino));
  });
  const observacionesVisibles = observaciones.filter((observacion) => {
    const coincideEstado = !estadoFiltro || observacion.estado === estadoFiltro;
    const texto = `${observacion.codigo} ${observacion.titulo} ${observacion.responsableNombre ?? ""}`.toLocaleLowerCase("es");
    return coincideEstado && (!termino || texto.includes(termino));
  });
  const hayFiltros = Boolean(termino || estadoFiltro);

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

      <NCFilters vista={vista} total={vista === "ncs" ? ncsVisibles.length : observacionesVisibles.length} />

      {vista === "ncs" ? (
        <ListaNC
          ncs={ncsVisibles}
          zona={zona}
          hayFiltros={hayFiltros}
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
        <ListaObservaciones observaciones={observacionesVisibles} zona={zona} hayFiltros={hayFiltros} />
      )}
    </div>
  );
}

function ListaNC({
  ncs,
  zona,
  slotNuevaNC,
  hayFiltros,
}: {
  ncs: Awaited<ReturnType<typeof obtenerNCs>>;
  zona: string;
  slotNuevaNC?: React.ReactNode;
  hayFiltros: boolean;
}) {
  if (ncs.length === 0) {
    return (
      <EmptyState
        icon={<AlertOctagon className="h-5 w-5" aria-hidden="true" />}
        title={hayFiltros ? "No hay coincidencias" : "No hay no conformidades registradas"}
        description={hayFiltros ? "Probá con otra búsqueda o eliminá los filtros activos." : "Cuando detectes un incumplimiento, abrí una no conformidad para gestionarla hasta su cierre."}
        action={hayFiltros
          ? <Link href="/ncs?vista=ncs" className={cn(buttonVariants({ variant: "outline" }))}>Limpiar filtros</Link>
          : slotNuevaNC}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="sticky top-0 z-10 hidden items-center gap-3 border-b border-border bg-muted/95 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur sm:flex">
        <span className="w-28 shrink-0">Código</span>
        <span className="flex-1">Título</span>
        <span className="w-40 shrink-0">Proceso</span>
        <span className="w-24 shrink-0">Estado</span>
        <span className="w-20 shrink-0 text-right">Abierta</span>
      </div>
      {ncs.map((nc) => {
        const meta = ESTADO_NC[nc.estado] ?? ESTADO_NC.abierta;
        const vencida = estaVencida(nc.fechaLimiteCierre, zona, nc.estado === "cerrada");
        const fecha = formatearFechaCorta(nc.fechaApertura, zona);
        return (
          <Link
            key={nc.id}
            href={`/ncs/${nc.id}`}
            className="group block border-t border-border px-4 py-3 transition-colors hover:bg-muted/30 sm:flex sm:items-center sm:gap-3 sm:py-2"
          >
            <span className="mb-2 flex items-center justify-between sm:mb-0 sm:w-28 sm:shrink-0 sm:justify-start sm:gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <span className="mr-auto ml-2 font-mono text-xs text-muted-foreground sm:mr-0 sm:ml-0">{nc.codigo}</span>
              <span className="inline-flex items-center rounded px-2 py-1 text-[11px] font-medium sm:hidden" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="block font-medium text-sm sm:flex-1 sm:truncate sm:font-normal">
              {nc.titulo}
              {vencida && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
            </span>
            <span className="mt-2 block truncate text-xs text-muted-foreground sm:mt-0 sm:w-40 sm:shrink-0">
              <span className="sm:hidden">Proceso: </span>
              {nc.procesoNombre ?? <span className="text-muted-foreground/50">—</span>}
            </span>
            <span className="hidden w-24 shrink-0 items-center gap-1.5 sm:flex">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground sm:mt-0 sm:w-20 sm:shrink-0 sm:text-right"><span className="sm:hidden">Abierta: </span>{fecha}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ListaObservaciones({ observaciones, zona, hayFiltros }: { observaciones: Awaited<ReturnType<typeof obtenerObservaciones>>; zona: string; hayFiltros: boolean }) {
  if (observaciones.length === 0) {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" aria-hidden="true" />}
        title={hayFiltros ? "No hay coincidencias" : "No hay observaciones registradas"}
        description={hayFiltros ? "Probá con otra búsqueda o eliminá los filtros activos." : "Las observaciones y oportunidades de mejora se registran durante las auditorías y se gestionan desde acá."}
        action={hayFiltros
          ? <Link href="/ncs?vista=observaciones" className={cn(buttonVariants({ variant: "outline" }))}>Limpiar filtros</Link>
          : <Link href="/auditorias" className={cn(buttonVariants({ variant: "outline" }))}>Ir a auditorías</Link>}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="sticky top-0 z-10 hidden items-center gap-3 border-b border-border bg-muted/95 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur sm:flex">
        <span className="w-28 shrink-0">Código</span>
        <span className="flex-1">Título</span>
        <span className="w-32 shrink-0">Responsable</span>
        <span className="w-24 shrink-0">Estado</span>
        <span className="w-20 shrink-0 text-right">Límite</span>
      </div>
      {observaciones.map((o) => {
        const meta = ESTADO_OBS[o.estado] ?? ESTADO_OBS.abierto;
        const vencida = estaVencida(o.fechaLimite, zona, o.estado === "cerrado");
        const limite = formatearFechaCorta(o.fechaLimite, zona);
        return (
          <Link
            key={o.id}
            href={`/ncs/observacion/${o.id}`}
            className="group block border-t border-border px-4 py-3 transition-colors hover:bg-muted/30 sm:flex sm:items-center sm:gap-3 sm:py-2"
          >
            <span className="mb-2 flex items-center sm:mb-0 sm:w-28 sm:shrink-0 sm:gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <span className="ml-2 font-mono text-xs text-muted-foreground sm:ml-0">{o.codigo}</span>
              <span className="ml-auto inline-flex items-center rounded px-2 py-1 text-[11px] font-medium sm:hidden" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="block font-medium text-sm sm:flex-1 sm:truncate sm:font-normal">
              <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {TIPO_OBS_LABEL[o.tipo] ?? o.tipo}
              </span>
              {o.titulo}
              {vencida && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Vencida</span>}
            </span>
            <span className="mt-2 block truncate text-xs text-muted-foreground sm:mt-0 sm:w-32 sm:shrink-0">
              <span className="sm:hidden">Responsable: </span>
              {o.responsableNombre ?? <span className="text-muted-foreground/50">Sin asignar</span>}
            </span>
            <span className="hidden w-24 shrink-0 items-center gap-1.5 sm:flex">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground sm:mt-0 sm:w-20 sm:shrink-0 sm:text-right"><span className="sm:hidden">Límite: </span>{limite}</span>
          </Link>
        );
      })}
    </div>
  );
}
