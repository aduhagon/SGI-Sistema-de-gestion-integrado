import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning, ArrowRight, LayoutGrid } from "lucide-react";
import { obtenerPanoramaNormas } from "@/lib/api/matriz";
import { esMultinorma } from "@/lib/api/config-sistema";

export const dynamic = "force-dynamic";

export default async function PanoramaCumplimientoPage() {
  const [normas, multinorma] = await Promise.all([
    obtenerPanoramaNormas(),
    esMultinorma(),
  ]);

  // Totales consolidados (todas las normas juntas).
  const totalReq = normas.reduce((s, n) => s + n.totalRequisitos, 0);
  const totalCub = normas.reduce((s, n) => s + n.requisitosCubiertos, 0);
  const totalCriticos = normas.reduce((s, n) => s + n.criticosSinCubrir, 0);
  const pctGlobal = totalReq > 0 ? Math.round((totalCub / totalReq) * 100) : 0;

  if (normas.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <Encabezado multinorma={multinorma} />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileWarning className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No hay normas con requisitos cargados</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Cargá los requisitos de al menos una norma para ver el panorama de cumplimiento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <Encabezado multinorma={multinorma} />

      {/* Consolidado global */}
      <div className={"mb-8 grid grid-cols-1 gap-4 " + (multinorma ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Cobertura global
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-semibold">{pctGlobal}%</span>
            <span className="text-sm text-muted-foreground">
              {totalCub} de {totalReq}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pctGlobal}%` }}
            />
          </div>
        </div>

        {multinorma && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Normas activas
            </div>
            <div className="mt-1 font-serif text-3xl font-semibold">{normas.length}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Con requisitos cargados
            </p>
          </div>
        )}

        <div
          className={
            "rounded-lg border p-5 " +
            (totalCriticos > 0
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-card")
          }
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Críticos sin cubrir
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-serif text-3xl font-semibold">{totalCriticos}</span>
            {totalCriticos > 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {multinorma ? "En todas las normas" : "En la norma"}
          </p>
        </div>
      </div>

      {/* Tarjetas por norma */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {normas.map((n) => {
          const sinCubrir = n.totalRequisitos - n.requisitosCubiertos;
          return (
            <Link
              key={n.versionNormaId}
              href={`/cumplimiento?norma=${n.versionNormaId}`}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold tracking-tight">
                    {n.nombreCorto}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {n.codigo} · versión {n.version}
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif text-2xl font-semibold">{n.pctCobertura}%</span>
                <span className="text-sm text-muted-foreground">
                  {n.requisitosCubiertos} de {n.totalRequisitos} requisitos
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${n.pctCobertura}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                  {sinCubrir} sin cubrir
                </span>
                {n.criticosSinCubrir > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    {n.criticosSinCubrir} crítico{n.criticosSinCubrir !== 1 ? "s" : ""} sin cubrir
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Encabezado({ multinorma }: { multinorma: boolean }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {multinorma ? "Cumplimiento multinorma" : "Cumplimiento normativo"}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
            Panorama de cumplimiento
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {multinorma
              ? "Estado de cobertura documental de todas las normas certificadas, de un vistazo. Tocá una norma para ver su matriz requisito por requisito."
              : "Estado de cobertura documental de la norma, de un vistazo. Tocá la norma para ver su matriz requisito por requisito."}
          </p>
        </div>
        <Link
          href="/cumplimiento"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Ver matriz detallada
        </Link>
      </div>
    </header>
  );
}
