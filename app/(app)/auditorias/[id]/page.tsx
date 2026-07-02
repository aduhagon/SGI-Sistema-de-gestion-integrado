import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, Calendar, Building2, Undo2, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SeccionHallazgos } from "@/components/auditorias/SeccionHallazgos";
import { SeccionEquipo } from "@/components/auditorias/SeccionEquipo";
import { SeccionChecklist } from "@/components/auditorias/SeccionChecklist";
import { BarraFlujoAuditoria } from "@/components/auditorias/BarraFlujoAuditoria";
import {
  obtenerHallazgosDeAuditoria,
  obtenerRequisitosDeAuditoria,
  obtenerProcesosDeAuditoria,
} from "@/lib/api/hallazgos";
import {
  obtenerEquipoDeAuditoria,
  obtenerCandidatosEquipo,
  obtenerPermisosAuditoria,
} from "@/lib/api/auditoria-equipo";
import { obtenerChecklistDeAuditoria } from "@/lib/api/auditoria-checklist";
import { obtenerAdjuntosDeHallazgos, type AdjuntoHallazgo } from "@/lib/api/adjuntos-hallazgo";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { creada?: string };
};

const TIPO_LABEL: Record<string, string> = {
  interna: "Interna", externa: "Externa", certificacion: "Certificación",
  vigilancia: "Vigilancia", recertificacion: "Recertificación",
};
const ESTADO_LABEL: Record<string, string> = {
  planificada: "Planificada", en_curso: "En curso", informe_emitido: "Informe emitido",
  cerrada: "Cerrada", cancelada: "Cancelada",
};

function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AuditoriaDetallePage({ params, searchParams }: Props) {
  const supabase = createClient();

  const { data: aud, error } = await supabase
    .from("auditorias")
    .select(
      `id, codigo, titulo, descripcion, tipo, estado, fecha_planificada,
       fecha_inicio_real, fecha_fin_real, informe_emitido_por, motivo_devolucion, conclusiones,
       entidad_certificadora, objetivo, alcance_general, criterios,
       auditoria_alcance (
         id,
         version_norma:versiones_norma!auditoria_alcance_version_norma_id_fkey (
           version, normas:normas!versiones_norma_norma_id_fkey (codigo, nombre_corto)
         ),
         proceso:procesos!auditoria_alcance_proceso_id_fkey (codigo, nombre)
       )`,
    )
    .eq("id", params.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !aud) notFound();

  const alcance = ((aud as any).auditoria_alcance ?? []) as Array<{
    id: string;
    version_norma: { version: string; normas: { codigo: string; nombre_corto: string } | null } | null;
    proceso: { codigo: string; nombre: string } | null;
  }>;

  const normas = alcance.filter((a) => a.version_norma);
  const procesos = alcance.filter((a) => a.proceso);

  const [
    hallazgos, requisitosVinc, procesosVinc,
    equipo, candidatos, permisos, checklist, usuarioId,
  ] = await Promise.all([
    obtenerHallazgosDeAuditoria(params.id),
    obtenerRequisitosDeAuditoria(params.id),
    obtenerProcesosDeAuditoria(params.id),
    obtenerEquipoDeAuditoria(params.id),
    obtenerCandidatosEquipo(),
    obtenerPermisosAuditoria(params.id),
    obtenerChecklistDeAuditoria(params.id),
    obtenerUsuarioActualId(),
  ]);

  // Adjuntos de documentación por hallazgo.
  const adjuntos = await obtenerAdjuntosDeHallazgos(hallazgos.map((h) => h.id));
  const adjuntosPorHallazgo: Record<string, AdjuntoHallazgo[]> = {};
  for (const a of adjuntos) {
    (adjuntosPorHallazgo[a.hallazgoId] ??= []).push(a);
  }

  const estado = aud.estado as string;
  const checklistPendientes = checklist.filter((i) => i.resultado === "pendiente").length;
  const emitidoPorMi = !!usuarioId && (aud as any).informe_emitido_por === usuarioId;

  // Reglas de habilitación derivadas del estado + permisos.
  const puedeRegistrarHallazgos =
    (permisos.esMiembroEquipo && estado === "en_curso") || permisos.esSgiOAdmin;
  const puedeAdjuntar = permisos.esMiembroEquipo && estado === "en_curso";
  const tratamientoHabilitado = estado === "cerrada";
  const esLiderOSgi = permisos.esLider || permisos.esSgiOAdmin;

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      {searchParams.creada === "1" && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Auditoría creada. Sumá el equipo auditor y definí el checklist antes de iniciarla.</span>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/auditorias" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a auditorías
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">{aud.codigo}</Badge>
          <span className="text-xs text-muted-foreground">{TIPO_LABEL[aud.tipo] ?? aud.tipo}</span>
          <Badge variant="muted">{ESTADO_LABEL[estado] ?? estado}</Badge>
        </div>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight leading-tight">
          {aud.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Planificada: {fechaLarga(aud.fecha_planificada)}
          </span>
          {aud.fecha_inicio_real && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>Inicio: {fechaLarga(aud.fecha_inicio_real)}</span>
            </>
          )}
          {aud.fecha_fin_real && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Flag className="h-4 w-4" aria-hidden="true" />
                Cierre: {fechaLarga(aud.fecha_fin_real)}
              </span>
            </>
          )}
          {aud.entidad_certificadora && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {aud.entidad_certificadora}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Banner de devolución: visible mientras la auditoría volvió a en_curso. */}
      {estado === "en_curso" && aud.motivo_devolucion && (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
          <Undo2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">El auditor líder devolvió el informe.</p>
            <p className="mt-0.5">{aud.motivo_devolucion}</p>
          </div>
        </div>
      )}

      {/* Barra de acciones del flujo. */}
      <BarraFlujoAuditoria
        auditoriaId={params.id}
        estado={estado}
        esLider={permisos.esLider}
        esMiembroEquipo={permisos.esMiembroEquipo}
        esSgiOAdmin={permisos.esSgiOAdmin}
        checklistPendientes={checklistPendientes}
        emitidoPorMi={emitidoPorMi}
      />

      {aud.objetivo && (
        <section className="mb-8">
          <h2 className="mb-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Objetivo</h2>
          <p className="text-sm leading-relaxed text-foreground">{aud.objetivo}</p>
        </section>
      )}

      <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Normas en alcance</h2>
          {normas.length > 0 ? (
            <div className="space-y-2">
              {normas.map((n) => (
                <div key={n.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <Badge variant="outline" className="font-mono">{n.version_norma?.normas?.codigo}</Badge>
                  <span>{n.version_norma?.normas?.nombre_corto}</span>
                  <span className="text-xs text-muted-foreground">{n.version_norma?.version}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin normas específicas.</p>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">Procesos en alcance</h2>
          {procesos.length > 0 ? (
            <div className="space-y-2">
              {procesos.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{p.proceso?.codigo}</span>
                  <span>{p.proceso?.nombre}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin procesos específicos.</p>
          )}
        </div>
      </section>

      <SeccionEquipo
        auditoriaId={params.id}
        equipo={equipo}
        candidatos={candidatos}
        puedeGestionar={esLiderOSgi || permisos.esMiembroEquipo}
        estadoAuditoria={estado}
      />

      <SeccionChecklist
        auditoriaId={params.id}
        items={checklist}
        requisitos={requisitosVinc}
        estadoAuditoria={estado}
        esLiderOSgi={esLiderOSgi}
        esMiembroEquipo={permisos.esMiembroEquipo}
      />

      <SeccionHallazgos
        auditoriaId={params.id}
        hallazgos={hallazgos}
        requisitos={requisitosVinc}
        procesos={procesosVinc}
        puedeRegistrar={puedeRegistrarHallazgos}
        tratamientoHabilitado={tratamientoHabilitado}
        adjuntosPorHallazgo={adjuntosPorHallazgo}
        puedeAdjuntar={puedeAdjuntar}
      />

      {/* Conclusiones: visibles con la auditoría cerrada. */}
      {estado === "cerrada" && aud.conclusiones && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Conclusiones
          </h2>
          <p className="text-sm leading-relaxed text-foreground">{aud.conclusiones}</p>
        </section>
      )}
    </div>
  );
}
