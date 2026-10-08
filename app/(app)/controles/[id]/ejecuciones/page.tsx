import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obtenerEjecucionesControl } from "@/lib/api/mejora";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { formatearFechaLarga } from "@/lib/fechas";
import { AbrirNCControl } from "@/components/controles/AbrirNCControl";
import { ResaltarDestinoPendiente } from "@/components/pendientes/ResaltarDestinoPendiente";

export const dynamic = "force-dynamic";
export default async function EjecucionesPage({ params, searchParams }: { params: { id: string }; searchParams: { pagina?: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const pagina = Math.max(0, Math.min(10000, Number.parseInt(searchParams.pagina ?? "0", 10) || 0));
  const [{ data: control, error }, { ejecuciones, total }, zona] = await Promise.all([
    createClient().from("controles").select("id,codigo,nombre").eq("id", params.id).maybeSingle(),
    obtenerEjecucionesControl(params.id, pagina), obtenerZonaHoraria(),
  ]);
  if (error) throw new Error(error.message);
  if (!control) notFound();
  return <div className="mx-auto max-w-4xl p-6 sm:p-8">
    <Link href={`/controles?control=${control.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver al control</Link>
    <header className="my-6"><p className="font-mono text-xs text-muted-foreground">{control.codigo}</p><h1 className="text-2xl font-semibold break-words">{control.nombre}</h1><p className="mt-2 text-sm text-muted-foreground">Ejecuciones ({total})</p></header>
    <ResaltarDestinoPendiente
      encontradoMensaje="Ubicamos la ejecución indicada desde el Centro de pendientes. Revisá ese registro para cerrar la tarea."
      faltanteMensaje="No encontramos la ejecución exacta indicada por el pendiente. Puede haber sido resuelta o estar en otra página."
    />
    <div className="divide-y border-y border-border">
      {ejecuciones.map((e) => <article key={e.id} id={`ejecucion-${e.id}`} className="scroll-mt-24 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-medium">{formatearFechaLarga(e.fecha_ejecucion, zona)}</p><span className={`text-xs ${e.resultado === "inefectivo" ? "text-red-700" : e.resultado === "parcial" ? "text-amber-700" : "text-emerald-700"}`}>{e.resultado === "no_aplica" ? "No aplica" : e.resultado}</span></div>
          {e.nc ? <Link className="text-sm text-primary underline" href={`/ncs/${e.nc.id}`}>{e.nc.codigo} · {e.nc.estado.replaceAll("_", " ")}</Link> : ["parcial", "inefectivo"].includes(e.resultado) ? <AbrirNCControl ejecucionId={e.id} /> : null}
        </div>
        {e.detalle && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{e.detalle}</p>}
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground"><strong>Evidencia:</strong> {e.evidencia_descripcion ?? "Sin evidencia registrada"}</p>
        {e.contexto && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{e.contexto.proceso.nombre}</span><span>{e.contexto.requisitos.map((r) => r.codigo).join(", ")}</span><span>{e.contexto.riesgos.map((r) => r.codigo).join(", ")}</span></div>}
      </article>)}
      {!ejecuciones.length && <p className="py-8 text-sm text-muted-foreground">Sin ejecuciones en esta página.</p>}
    </div>
    <nav aria-label="Páginas de ejecuciones" className="mt-5 flex justify-between text-sm">
      {pagina > 0 ? <Link href={`?pagina=${pagina - 1}`} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Anterior</Link> : <span />}
      {(pagina + 1) * 25 < total && <Link href={`?pagina=${pagina + 1}`} className="flex items-center gap-2">Siguiente<ArrowRight className="h-4 w-4" /></Link>}
    </nav>
  </div>;
}
