import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import {
  obtenerNormasConRequisitos,
  obtenerMatriz,
} from "@/lib/api/matriz";
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

  const versionNormaId = searchParams.norma ?? normas[0].versionNormaId;
  const matriz = await obtenerMatriz(versionNormaId);

  const pct = matriz && matriz.totalRequisitos > 0
    ? Math.round((matriz.requisitosCubiertos / matriz.totalRequisitos) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Cumplimiento multinorma
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
          Matriz de cumplimiento
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Qué documento cubre cada requisito de la norma. Los requisitos sin documento
          asociado son huecos de cumplimiento que conviene resolver antes de una auditoría.
        </p>
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

      {matriz && (
        <>
          {/* Resumen */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cobertura
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold">{pct}%</span>
                <span className="text-sm text-muted-foreground">
                  {matriz.requisitosCubiertos} de {matriz.totalRequisitos}
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
                Requisitos sin cobertura
              </div>
              <div className="mt-1 font-serif text-3xl font-semibold">
                {matriz.totalRequisitos - matriz.requisitosCubiertos}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Huecos de cumplimiento documental
              </p>
            </div>

            <div
              className={
                "rounded-lg border p-5 " +
                (matriz.requisitosCriticosSinCobertura > 0
                  ? "border-rose-300 bg-rose-50"
                  : "border-border bg-card")
              }
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Críticos sin cubrir
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-serif text-3xl font-semibold">
                  {matriz.requisitosCriticosSinCobertura}
                </span>
                {matriz.requisitosCriticosSinCobertura > 0 && (
                  <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Requisitos críticos sin documento
              </p>
            </div>
          </div>

          {/* Tabla de requisitos */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Cláusula</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Requisito</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Documentos que lo cubren
                  </th>
                </tr>
              </thead>
              <tbody>
                {matriz.requisitos.map((r) => (
                  <tr
                    key={r.requisitoId}
                    className={
                      "border-b border-border last:border-0 " +
                      (!r.cubierto && r.esCritico ? "bg-rose-50/50" : "")
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        {r.clausula}
                        {r.esCritico && (
                          <span
                            title="Requisito crítico"
                            className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">{r.titulo}</td>
                    <td className="px-4 py-3 align-top">
                      {r.cubierto ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.coberturas.map((c) => (
                            <Link
                              key={c.documentoId}
                              href={`/documentos/${c.documentoId}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted/50"
                              title={`${c.titulo} · cobertura ${c.tipoCobertura}`}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLOR_COBERTURA[c.tipoCobertura] ?? "#475569",
                                }}
                              />
                              <span className="font-mono">{c.codigo}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          Sin cobertura
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#059669" }} />
              Cobertura total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#d97706" }} />
              Parcial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0284c7" }} />
              Referencia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Requisito crítico
            </span>
          </div>
        </>
      )}
    </div>
  );
}
