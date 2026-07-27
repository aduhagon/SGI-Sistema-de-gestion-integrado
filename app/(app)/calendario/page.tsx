import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import {
  esGestorSgi,
  obtenerEventosCalendario,
  obtenerHuecosCalendario,
  obtenerProcesosParaFiltro,
  MODULO_COLOR_CALENDARIO,
  MODULO_LABEL_CALENDARIO,
  type ScopeCalendario,
} from "@/lib/api/calendario";
import { GrillaMes } from "@/components/calendario/GrillaMes";
import { PanelSinFecha } from "@/components/calendario/PanelSinFecha";

export const dynamic = "force-dynamic";

type SearchParams = {
  mes?: string; // YYYY-MM
  scope?: string; // personal | global
  proceso?: string; // uuid
};

const NOMBRE_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Fecha de hoy en la zona del sistema, como YYYY-MM-DD. */
function hoyEnZona(zona: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Interpreta ?mes=YYYY-MM; si viene vacío o mal formado, cae al mes actual. */
function resolverMes(param: string | undefined, hoy: string) {
  const crudo = param ?? hoy.slice(0, 7);
  const m = /^(\d{4})-(\d{2})$/.exec(crudo);
  if (!m) {
    return { anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) };
  }
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) {
    return { anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) };
  }
  return { anio, mes };
}

function desplazarMes(anio: number, mes: number, delta: number): string {
  const total = anio * 12 + (mes - 1) + delta;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
}

function ultimoDia(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function construirUrl(params: {
  mes: string;
  scope: ScopeCalendario;
  proceso?: string;
}): string {
  const qs = new URLSearchParams({ mes: params.mes, scope: params.scope });
  if (params.proceso) qs.set("proceso", params.proceso);
  return `/calendario?${qs.toString()}`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const zona = await obtenerZonaHoraria();
  const hoy = hoyEnZona(zona);

  const { anio, mes } = resolverMes(searchParams.mes, hoy);
  const mesParam = `${anio}-${String(mes).padStart(2, "0")}`;

  const gestor = await esGestorSgi();
  // Un usuario sin rol global siempre ve su propio calendario. Aunque forzara
  // ?scope=global por URL, fn_calendario_eventos cae a personal del lado del
  // servidor; acá solo evitamos ofrecer un selector que no haría nada.
  const scope: ScopeCalendario =
    gestor && searchParams.scope === "global" ? "global" : "personal";

  const desde = `${mesParam}-01`;
  const hasta = `${mesParam}-${String(ultimoDia(anio, mes)).padStart(2, "0")}`;

  const [eventosTodos, huecos, procesos] = await Promise.all([
    obtenerEventosCalendario(desde, hasta, scope),
    obtenerHuecosCalendario(scope),
    scope === "global" ? obtenerProcesosParaFiltro() : Promise.resolve([]),
  ]);

  const procesoFiltro = searchParams.proceso;
  const eventos = procesoFiltro
    ? eventosTodos.filter((e) => e.procesoId === procesoFiltro)
    : eventosTodos;

  const vencidos = eventos.filter(
    (e) => e.nivel === "vencido" || e.nivel === "vencido_hoy",
  ).length;

  // Módulos presentes en el mes, para armar una referencia de colores acotada.
  const modulosPresentes = Array.from(new Set(eventos.map((e) => e.modulo)));

  const mesMostrado = hoy.slice(0, 7) === mesParam ? hoy : null;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Inicio
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Calendario
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Vencimientos del SGI ubicados en el tiempo: aprobaciones, acuses,
          revisiones de riesgos y documentos, no conformidades, auditorías,
          hallazgos y evaluaciones de cumplimiento legal.
        </p>
      </header>

      {/* Navegación de mes y alcance */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={construirUrl({
              mes: desplazarMes(anio, mes, -1),
              scope,
              proceso: procesoFiltro,
            })}
            aria-label="Mes anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {NOMBRE_MES[mes - 1]} {anio}
          </span>
          <Link
            href={construirUrl({
              mes: desplazarMes(anio, mes, 1),
              scope,
              proceso: procesoFiltro,
            })}
            aria-label="Mes siguiente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {hoy.slice(0, 7) !== mesParam && (
            <Link
              href={construirUrl({
                mes: hoy.slice(0, 7),
                scope,
                proceso: procesoFiltro,
              })}
              className="ml-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Ir a hoy
            </Link>
          )}
        </div>

        {gestor && (
          <div className="flex gap-2">
            <Link
              href={construirUrl({ mes: mesParam, scope: "personal" })}
              className={
                scope === "personal"
                  ? "rounded-md border border-primary/50 bg-primary/[0.06] px-3 py-1.5 text-sm font-medium"
                  : "rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
              }
            >
              Mi calendario
            </Link>
            <Link
              href={construirUrl({ mes: mesParam, scope: "global" })}
              className={
                scope === "global"
                  ? "rounded-md border border-primary/50 bg-primary/[0.06] px-3 py-1.5 text-sm font-medium"
                  : "rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-primary/[0.05] hover:text-foreground"
              }
            >
              Todo el SGI
            </Link>
          </div>
        )}
      </div>

      {/* Filtro por proceso: solo tiene sentido en la vista global */}
      {scope === "global" && procesos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={construirUrl({ mes: mesParam, scope })}
            className={
              !procesoFiltro
                ? "rounded-md border border-primary/50 bg-primary/[0.06] px-2 py-1 text-xs font-medium"
                : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            Todos los procesos
          </Link>
          {procesos.map((p) => (
            <Link
              key={p.id}
              href={construirUrl({ mes: mesParam, scope, proceso: p.id })}
              title={p.nombre}
              className={
                procesoFiltro === p.id
                  ? "rounded-md border border-primary/50 bg-primary/[0.06] px-2 py-1 text-xs font-medium"
                  : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {p.codigo}
            </Link>
          ))}
        </div>
      )}

      {/* Resumen del mes */}
      <p className="mb-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{eventos.length}</span>{" "}
        evento{eventos.length === 1 ? "" : "s"} este mes
        {vencidos > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-red-700">
              {vencidos} vencido{vencidos === 1 ? "" : "s"} o vence
              {vencidos === 1 ? "" : "n"} hoy
            </span>
          </>
        )}
      </p>

      <GrillaMes anio={anio} mes={mes} hoy={mesMostrado} eventos={eventos} />

      {/* Referencia de colores, acotada a lo que realmente aparece */}
      {modulosPresentes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {modulosPresentes.map((m) => (
            <span
              key={m}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  MODULO_COLOR_CALENDARIO[m] ?? "bg-slate-400"
                }`}
              />
              {MODULO_LABEL_CALENDARIO[m] ?? m}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <PanelSinFecha huecos={huecos} />
      </div>
    </div>
  );
}
