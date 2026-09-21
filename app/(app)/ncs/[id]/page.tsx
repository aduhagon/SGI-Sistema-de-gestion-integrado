import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, Calendar, Network, AlertTriangle, Microscope } from "lucide-react";
import { obtenerNCDetalle } from "@/lib/api/ncs";
import { obtenerAccionesDeNC, obtenerVerificacionesDeNC } from "@/lib/api/acciones";
import { obtenerAdjuntosDeNC } from "@/lib/api/adjuntos-nc";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { obtenerTrazabilidadNC } from "@/lib/api/trazabilidad";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuariosElegibles } from "@/lib/api/envio";
import { Badge } from "@/components/ui/badge";
import { AnalisisCausaForm } from "@/components/ncs/AnalisisCausaForm";
import { GestionAcciones } from "@/components/ncs/GestionAcciones";
import { VerificacionEficaciaSection } from "@/components/ncs/VerificacionEficacia";
import { AdjuntosNCSection } from "@/components/ncs/AdjuntosNC";
import { TrazabilidadCiclo } from "@/components/ncs/TrazabilidadCiclo";
import { obtenerZonaHoraria } from "@/lib/api/ajustes";
import { formatearFechaLarga } from "@/lib/fechas";
import { obtenerEstadoTratamiento, obtenerVerificadoresMejora } from "@/lib/api/mejora";
import { PlanTratamiento } from "@/components/ncs/PlanTratamiento";
import { BotonCerrar } from "@/components/ncs/BotonCerrar";
import { cerrarNC } from "./cerrar-nc-actions";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { creada?: string } };

const ESTADO_META: Record<string, { label: string; color: string }> = {
  abierta: { label: "Abierta", color: "#dc2626" },
  en_analisis: { label: "En análisis", color: "#d97706" },
  en_tratamiento: { label: "En tratamiento", color: "#0284c7" },
  cerrada: { label: "Cerrada", color: "#059669" },
  aceptado_riesgo: { label: "Riesgo aceptado", color: "#6b7280" },
};
const SEV: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const ORIGEN: Record<string, string> = {
  auditoria_interna: "Auditoría interna", auditoria_externa: "Auditoría externa",
  reclamo_cliente: "Reclamo de cliente", control_interno: "Control interno",
  proveedor: "Proveedor", accidente: "Accidente", otro: "Otro",
};
const METODO: Record<string, string> = {
  cinco_porques: "Cinco porqués", ishikawa: "Ishikawa", pareto: "Pareto",
  arbol_fallas: "Árbol de fallas", otro: "Otro",
};

export default async function NCDetallePage({ params, searchParams }: Props) {
  const nc = await obtenerNCDetalle(params.id);
  if (!nc) notFound();

  const [acciones, verificaciones, usuarios, zona, trazabilidad, permisos, verificadores] = await Promise.all([
    obtenerAccionesDeNC(params.id),
    obtenerVerificacionesDeNC(params.id),
    obtenerUsuariosElegibles(null),
    obtenerZonaHoraria(),
    obtenerTrazabilidadNC(params.id),
    obtenerEstadoTratamiento(params.id),
    obtenerVerificadoresMejora(),
  ]);

  const adjuntos = await obtenerAdjuntosDeNC(params.id);

  // ¿el usuario actual abrió esta NC? (define si puede adjuntar/quitar)
  const usuarioActualId = await obtenerUsuarioActualId();
  const supabase = createClient();
  const { data: ncCreador } = await supabase
    .from("no_conformidades")
    .select("creado_por")
    .eq("id", params.id)
    .maybeSingle();
  const puedeAdjuntar =
    !!usuarioActualId && ncCreador?.creado_por === usuarioActualId;

  const meta = ESTADO_META[nc.estado] ?? ESTADO_META.abierta;

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      {searchParams.creada === "1" && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>No conformidad abierta correctamente. Cargá el análisis de causa raíz para avanzar.</span>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/ncs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Volver a no conformidades
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">{nc.codigo}</Badge>
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Severidad {SEV[nc.severidad]}</span>
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight leading-tight">{nc.titulo}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{ORIGEN[nc.origen] ?? nc.origen}</span>
          {nc.hallazgoCodigo && (<><span className="text-muted-foreground/40">·</span><span className="font-mono text-xs">Hallazgo {nc.hallazgoCodigo}</span></>)}
          {nc.procesoNombre && (<><span className="text-muted-foreground/40">·</span><span className="flex items-center gap-1"><Network className="h-3.5 w-3.5" aria-hidden="true" />{nc.procesoNombre}</span></>)}
          <span className="text-muted-foreground/40">·</span>
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />Abierta {formatearFechaLarga(nc.fechaApertura, zona)}</span>
        </div>
      </header>

      <PlanTratamiento nc={nc} usuarios={usuarios} verificadores={verificadores} puedeGestionar={permisos.puedeGestionar} />
      {(nc.ejecucion || nc.hallazgosVinculados.length > 0) && <section className="mb-8 border-b border-border pb-5">
        <h2 className="mb-3 text-sm font-semibold">Origen y evidencia</h2>
        {nc.hallazgosVinculados.map((h) => <Link key={h.codigo} className="mb-2 block text-sm text-primary underline" href={`/auditorias/${h.auditoria_id}`}>Auditoría · {h.codigo}</Link>)}
        {nc.ejecucion && <>
          <Link className="text-sm text-primary underline" href={`/controles/${nc.ejecucion.control_id}/ejecuciones`}>{nc.ejecucion.contexto?.control.codigo ?? "Control"} · {nc.ejecucion.resultado}</Link>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{nc.ejecucion.evidencia_descripcion}</p>
          {nc.ejecucion.contexto && <div className="mt-3 grid gap-4 text-xs sm:grid-cols-3">
            <div><h3 className="font-medium">Requisitos</h3>{nc.ejecucion.contexto.requisitos.map((r) => <p key={r.id} className="mt-1 break-words">{r.codigo} · {r.nombre}</p>)}</div>
            <div><h3 className="font-medium">Riesgos</h3>{nc.ejecucion.contexto.riesgos.map((r) => <p key={r.id} className="mt-1 break-words">{r.codigo} · {r.nombre}</p>)}</div>
            <div><h3 className="font-medium">Documentos</h3>{nc.ejecucion.contexto.documentos.map((r) => <Link key={r.id} href={`/documentos/${r.id}`} className="mt-1 block break-words text-primary underline">{r.codigo} · {r.nombre}</Link>)}</div>
          </div>}
        </>}
      </section>}

      <section className="mb-8">
        <h2 className="mb-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Descripción</h2>
        <p className="text-sm leading-relaxed text-foreground">{nc.descripcion}</p>
      </section>

      <div className="mb-8">
        <AdjuntosNCSection ncId={nc.id} adjuntos={adjuntos} puedeAdjuntar={puedeAdjuntar} />
      </div>

      {nc.requiereAccionInmediata && nc.accionInmediataDescripcion && (
        <section className="mb-8 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />Acción inmediata (contención)
          </h2>
          <p className="text-sm text-amber-800">{nc.accionInmediataDescripcion}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Microscope className="h-3.5 w-3.5" aria-hidden="true" />Análisis de causa raíz
        </h2>
        {nc.analisisCausaRaiz && (
          <div className="mb-4 rounded-md border border-border bg-muted/30 p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Método: {METODO[nc.metodoAnalisis ?? ""] ?? nc.metodoAnalisis}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{nc.analisisCausaRaiz}</p>
          </div>
        )}
        {permisos.puedeGestionar && <AnalisisCausaForm ncId={nc.id} metodoActual={nc.metodoAnalisis} analisisActual={nc.analisisCausaRaiz} />}
      </section>

      <div className="mb-10">
        <GestionAcciones ncId={nc.id} acciones={acciones} usuarios={usuarios} puedeGestionar={permisos.puedeGestionar} usuarioId={usuarioActualId} cerrada={["cerrada", "aceptado_riesgo"].includes(nc.estado)} />
      </div>

      <VerificacionEficaciaSection
        ncId={nc.id}
        verificaciones={verificaciones}
        acciones={acciones}
        puedeVerificar={permisos.puedeVerificar}
        revisionTratamiento={nc.revisionTratamiento}
      />

      {permisos.puedeGestionar && <div className="mt-8 flex flex-col items-start gap-3 border-t border-border pt-5">
        {permisos.bloqueoCierre ? <p className="text-sm text-amber-700">{permisos.bloqueoCierre}</p> : <BotonCerrar entidadId={nc.id} accionCerrar={cerrarNC} etiqueta="NC" campoLabel="Motivo de cierre" placeholder="Conclusión del tratamiento" notaValidacion="Eficacia verificada para el tratamiento vigente." />}
      </div>}

      <div className="mt-10">
        <TrazabilidadCiclo pasos={trazabilidad} zona={zona} />
      </div>
    </div>
  );
}
