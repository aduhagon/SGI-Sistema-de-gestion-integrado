import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning, Download } from "lucide-react";
import {
  obtenerNormasConRequisitos,
  obtenerArbolCumplimiento,
  obtenerPanoramaNormas,
} from "@/lib/api/matriz";
import ArbolCumplimiento from "@/components/cumplimiento/ArbolCumplimiento";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { norma?: string };
};

const COLOR_COBERTURA: Record<string, string> = {
  total: "#059669",
  parcial: "#d97706",
  referencia: "#0284c7",
};

export default async function CumplimientoPage({ searchParams }: Props) {
  const normas = await obtenerNormasConRequisitos();

  if (normas.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <header className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Cumplimiento multinorma
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Matriz de cumplimiento
          </h1>
        </header>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileWarning className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No hay requisitos cargados todavía</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            La matriz cruza los requisitos de cada norma con los documentos que los
            cubren. Cargá los requisitos de al menos una norma para empezar.
          </p>
        </div>
      </div>
    );
  }

  // Sin norma seleccionada → resumen multinorma consolidado.
  if (!searchParams.norma) {
    const panorama = await obtenerPanoramaNormas();

    const totReq = panorama.reduce((a, p) => a + p.totalRequisitos, 0);
    const totCub = panorama.reduce((a, p) => a + p.requisitosCubiertos, 0);
    const totCriticos = panorama.reduce((a, p) => a + p.criticosSinCubrir, 0);
    const pctGlobal = totReq > 0 ? Math.round((totCub / totReq) * 100) : 0;

    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <header className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Cumplimiento multinorma
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
                Panorama de cumplimiento
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Estado de cobertura de todas las normas del SGI. Elegí una norma para ver
                el detalle requisito por requisito.
              </p>
            </div>
            <a
              href="/api/cumplimiento/export"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar todo
            </a>
          </div>
        </header>

        {/* Consolidado global */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Cobertura global
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-semibold">{pctGlobal}%</span>
              <span className="text-sm text-muted-foreground">
                {totCub} de {totReq}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pctGlobal}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Normas activas
            </div>
            <div className="mt-1 font-serif text-3xl font-semibold">{panorama.length}</div>
            <p className="mt-2 text-xs text-muted-foreground">Con requisitos cargados</p>
          </div>
          <div
            className={
              "rounded-lg border p-5 " +
              (totCriticos > 0 ? "border-rose-300 bg-rose-50" : "border-border bg-card")
            }
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Críticos sin cubrir
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-serif text-3xl font-semibold">{totCriticos}</span>
              {totCriticos > 0 && (
                <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">En todas las normas</p>
          </div>
        </div>

        {/* Tarjeta por norma */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {panorama.map((n) => (
            <Link
              key={n.versionNormaId}
              href={`/cumplimiento?norma=${n.versionNormaId}`}
              className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-serif text-lg font-semibold tracking-tight group-hover:text-primary">
                    {n.nombreCorto}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {n.codigo} · versión {n.version}
                  </div>
                </div>
                <span className="font-serif text-2xl font-semibold">{n.pctCobertura}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${n.pctCobertura}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {n.requisitosCubiertos} de {n.totalRequisitos} cubiertos
                </span>
                {n.criticosSinCubrir > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {n.criticosSinCubrir} críticos sin cubrir
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Sin críticos pendientes
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const versionNormaId = searchParams.norma;
  const arbol = await obtenerArbolCumplimiento(versionNormaId);

  const pct = arbol ? arbol.pctGlobal : 0;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <Link
          href="/cumplimiento"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Volver al panorama
        </Link>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Cumplimiento multinorma
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
              Matriz de cumplimiento
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Qué documento cubre cada requisito de la norma. Los requisitos sin documento
              asociado son huecos de cumplimiento que conviene resolver antes de una auditoría.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/cumplimiento/export?norma=${versionNormaId}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar esta norma
            </a>
            <a
              href="/api/cumplimiento/export"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar todo
            </a>
          </div>
        </div>
      </header>

      {/* Selector de norma */}
      <div className="mb-8 flex flex-wrap gap-2">
        {normas.map((n) => {
          const activa = n.versionNormaId === versionNormaId;
          return (
            <Link
              key={n.versionNormaId}
              href={`/cumplimiento?norma=${n.versionNormaId}`}
              className={
                "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                (activa
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted/50")
              }
            >
              {n.nombreCorto} <span className="opacity-70">· {n.version}</span>
            </Link>
          );
        })}
      </div>

      {arbol && (
        <>
          {/* Resumen */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cumplimiento
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold">{pct}%</span>
                <span className="text-sm text-muted-foreground">
                  {arbol.hojasCubiertas} de {arbol.totalHojas} subpuntos
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Subpuntos sin cubrir
              </div>
              <div className="mt-1 font-serif text-3xl font-semibold">
                {Math.round((arbol.totalHojas - arbol.hojasCubiertas) * 10) / 10}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Huecos de cumplimiento documental
              </p>
            </div>

            <div
              className={
                "rounded-lg border p-5 " +
                (arbol.criticosSinCubrir > 0
                  ? "border-rose-300 bg-rose-50"
                  : "border-border bg-card")
              }
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Críticos sin cubrir
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-serif text-3xl font-semibold">
                  {arbol.criticosSinCubrir}
                </span>
                {arbol.criticosSinCubrir > 0 && (
                  <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Requisitos críticos sin documento
              </p>
            </div>
          </div>

          {/* Árbol jerárquico de cumplimiento */}
          <ArbolCumplimiento raices={arbol.raices} />
        </>
      )}
    </div>
  );
}
