import Link from "next/link";
import { AlertOctagon, Gauge, ShieldAlert, ArrowUpRight } from "lucide-react";
import type { NCLista } from "@/lib/api/ncs";
import type { Riesgo, NivelRiesgo } from "@/lib/api/riesgos";
import type { Indicador, CumplimientoEstado } from "@/lib/api/indicadores";

// ---------------------------------------------------------------------------
// Estilos de estado, alineados con el resto del sistema.
// ---------------------------------------------------------------------------

const NIVEL_RIESGO: Record<NivelRiesgo, { label: string; cls: string }> = {
  bajo: { label: "Bajo", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medio: { label: "Medio", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  alto: { label: "Alto", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  extremo: { label: "Extremo", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const CUMPLIMIENTO: Record<CumplimientoEstado, { label: string; cls: string }> = {
  cumple: { label: "Cumple", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  alerta: { label: "Alerta", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  incumple: { label: "Incumple", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  sin_meta: { label: "Sin meta", cls: "bg-muted text-muted-foreground border-border" },
};

const SEVERIDAD_NC: Record<string, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  media: { label: "Media", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  baja: { label: "Baja", cls: "bg-muted text-muted-foreground border-border" },
};

const ESTADO_NC_LABEL: Record<string, string> = {
  abierta: "Abierta",
  en_analisis: "En análisis",
  en_tratamiento: "En tratamiento",
  cerrada: "Cerrada",
  aceptado_riesgo: "Riesgo aceptado",
};

// Estados de NC que cuentan como "abierta" (alineado con lib/api/saludProcesos.ts).
const NC_ABIERTAS = new Set(["abierta", "en_analisis", "en_tratamiento"]);

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function EncabezadoSenal({
  icon: Icon,
  titulo,
  resumen,
  href,
  hrefLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  resumen: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {titulo}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{resumen}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        {hrefLabel}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function VacioSenal({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-6 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SenalesProceso({
  ncs,
  riesgos,
  indicadores,
}: {
  ncs: NCLista[];
  riesgos: Riesgo[];
  indicadores: Indicador[];
}) {
  const ncsAbiertas = ncs.filter((n) => NC_ABIERTAS.has(n.estado)).length;
  const riesgosAltos = riesgos.filter(
    (r) => r.nivel === "alto" || r.nivel === "extremo",
  ).length;
  const indIncumple = indicadores.filter(
    (i) => i.cumplimiento === "incumple",
  ).length;

  return (
    <>
      {/* No conformidades */}
      <section className="mb-10">
        <EncabezadoSenal
          icon={AlertOctagon}
          titulo="No conformidades"
          resumen={
            ncs.length === 0
              ? "Sin no conformidades registradas en este proceso."
              : `${ncs.length} en total · ${ncsAbiertas} abierta${ncsAbiertas === 1 ? "" : "s"}.`
          }
          href="/ncs"
          hrefLabel="Ver todas"
        />
        {ncs.length === 0 ? (
          <VacioSenal texto="Cuando se registre una NC asociada a este proceso, aparecerá acá." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {ncs.map((n, i) => (
              <Link
                key={n.id}
                href={`/ncs/${n.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                  i < ncs.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {n.codigo}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {n.titulo}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {ESTADO_NC_LABEL[n.estado] ?? n.estado.replace(/_/g, " ")}
                  </div>
                </div>
                <Pill
                  label={
                    SEVERIDAD_NC[n.severidad]?.label ?? n.severidad
                  }
                  cls={
                    SEVERIDAD_NC[n.severidad]?.cls ??
                    "bg-muted text-muted-foreground border-border"
                  }
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Indicadores */}
      <section className="mb-10">
        <EncabezadoSenal
          icon={Gauge}
          titulo="Indicadores"
          resumen={
            indicadores.length === 0
              ? "Sin indicadores definidos para este proceso."
              : `${indicadores.length} indicador${indicadores.length === 1 ? "" : "es"}${indIncumple > 0 ? ` · ${indIncumple} incumple${indIncumple === 1 ? "" : "n"} la meta` : ""}.`
          }
          href="/indicadores"
          hrefLabel="Ver todos"
        />
        {indicadores.length === 0 ? (
          <VacioSenal texto="Definí indicadores para medir el desempeño de este proceso." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {indicadores.map((ind, i) => {
              const c = CUMPLIMIENTO[ind.cumplimiento];
              return (
                <Link
                  key={ind.id}
                  href={`/indicadores/${ind.id}`}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                    i < indicadores.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {ind.codigo}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {ind.nombre}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {ind.ultimoValor !== null
                        ? `Último: ${ind.ultimoValor}${ind.unidad ? ` ${ind.unidad}` : ""}${ind.meta !== null ? ` · meta ${ind.meta}${ind.unidad ? ` ${ind.unidad}` : ""}` : ""}`
                        : "Sin mediciones cargadas"}
                    </div>
                  </div>
                  <Pill label={c.label} cls={c.cls} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Riesgos */}
      <section className="mb-10">
        <EncabezadoSenal
          icon={ShieldAlert}
          titulo="Riesgos y oportunidades"
          resumen={
            riesgos.length === 0
              ? "Sin riesgos ni oportunidades identificados."
              : `${riesgos.length} en total${riesgosAltos > 0 ? ` · ${riesgosAltos} de nivel alto o extremo` : ""}.`
          }
          href="/riesgos"
          hrefLabel="Ver todos"
        />
        {riesgos.length === 0 ? (
          <VacioSenal texto="Identificá los riesgos y oportunidades de este proceso." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {riesgos.map((r, i) => {
              const n = NIVEL_RIESGO[r.nivel];
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    i < riesgos.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {r.codigo}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {r.titulo}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {r.categoria}
                      {" · "}
                      P{r.probabilidad} × I{r.impacto}
                    </div>
                  </div>
                  <Pill label={n.label} cls={n.cls} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
