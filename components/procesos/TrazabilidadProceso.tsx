import Link from "next/link";
import { AlertCircle, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import type { Control, RequisitoAplicable } from "@/lib/api/controles";
import type { Riesgo } from "@/lib/api/riesgos";
import type { NCLista } from "@/lib/api/ncs";
import { cn } from "@/lib/utils";

const RESULTADO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  parcial: "Parcial",
  inefectivo: "Inefectivo",
  no_aplica: "No aplica",
};

export function TrazabilidadProceso({
  procesoId,
  controles,
  requisitos,
  riesgos,
  ncs,
}: {
  procesoId: string;
  controles: Control[];
  requisitos: RequisitoAplicable[];
  riesgos: Riesgo[];
  ncs: NCLista[];
}) {
  const riesgosCubiertos = new Set(controles.flatMap((control) => control.riesgos.map((riesgo) => riesgo.id)));
  const requisitosCubiertos = new Set(controles.flatMap((control) => control.requisitos.map((requisito) => requisito.id)));
  const controlesConEjecucion = controles.filter((control) => control.ultimaEjecucion).length;
  const riesgosSinControl = riesgos.filter((riesgo) => !riesgosCubiertos.has(riesgo.id));
  const requisitosQueAplican = requisitos.filter((requisito) => requisito.aplicabilidad === "aplica");
  const requisitosSinControl = requisitosQueAplican.filter((requisito) => !requisitosCubiertos.has(requisito.id));

  return (
    <section className="mb-10 border-y border-border py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Trazabilidad del proceso</h2>
        </div>
        <Link href={`/controles?proceso=${procesoId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Gestionar controles
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Metrica valor={requisitosQueAplican.length} etiqueta="Requisitos aplicables" alerta={requisitosSinControl.length > 0} />
        <Metrica valor={`${riesgosCubiertos.size}/${riesgos.length}`} etiqueta="Riesgos con control" alerta={riesgosSinControl.length > 0} />
        <Metrica valor={controles.length} etiqueta="Controles activos" alerta={controles.length === 0} />
        <Metrica valor={`${controlesConEjecucion}/${controles.length}`} etiqueta="Con evidencia" alerta={controles.length > 0 && controlesConEjecucion < controles.length} />
      </div>

      {controles.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 shrink-0" />
          El proceso todavía no tiene controles estructurados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Control</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Riesgos</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Requisitos</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Documentos</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {controles.map((control) => (
                <tr key={control.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/controles/${control.id}/ejecuciones`} className="font-medium hover:underline">{control.nombre}</Link>
                    <p className="font-mono text-xs text-muted-foreground">{control.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{control.riesgos.length}</td>
                  <td className="px-4 py-3 text-center">{control.requisitos.length}</td>
                  <td className="px-4 py-3 text-center">{control.documentos.length}</td>
                  <td className="px-4 py-3">
                    {control.ultimaEjecucion ? (
                      <span className={cn("inline-flex items-center gap-1.5 text-xs", control.ultimoResultado === "inefectivo" ? "text-red-700" : "text-emerald-700")}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {control.ultimoResultado ? RESULTADO_LABEL[control.ultimoResultado] : "Registrada"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin ejecuciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(riesgosSinControl.length > 0 || requisitosSinControl.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {riesgosSinControl.length > 0 && <span className="inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-amber-600" />{riesgosSinControl.length} riesgo{riesgosSinControl.length === 1 ? "" : "s"} sin control</span>}
          {requisitosSinControl.length > 0 && <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5 text-amber-600" />{requisitosSinControl.length} requisito{requisitosSinControl.length === 1 ? "" : "s"} aplicable{requisitosSinControl.length === 1 ? "" : "s"} sin control</span>}
        </div>
      )}
      {ncs.length > 0 && <div className="mt-5 border-t border-border pt-4"><h3 className="mb-3 text-sm font-medium">Tratamiento y eficacia</h3><ul className="space-y-2">
        {ncs.map((nc) => <li key={nc.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><Link href={`/ncs/${nc.id}`} className="text-primary hover:underline">{nc.codigo} · {nc.titulo}</Link><span className="text-xs text-muted-foreground">{nc.estado.replaceAll("_", " ")}{nc.fechaLimiteCierre ? ` · ${nc.fechaLimiteCierre}` : ""}</span></li>)}
      </ul></div>}
    </section>
  );
}

function Metrica({ valor, etiqueta, alerta }: { valor: string | number; etiqueta: string; alerta: boolean }) {
  return (
    <div className="border-l-2 border-border pl-3">
      <p className={cn("text-2xl font-semibold tabular-nums", alerta && "text-amber-700")}>{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  );
}
