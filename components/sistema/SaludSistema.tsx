import Link from "next/link";
import {
  Activity,
  Archive,
  CheckCircle2,
  CircleAlert,
  CloudCog,
  Database,
  HardDrive,
  MailCheck,
  ShieldCheck,
  Cable,
} from "lucide-react";
import type { SaludCorreo } from "@/lib/api/correo-salud";
import type { SaludSistema as SaludSistemaTipo } from "@/lib/api/sistema-salud";
import type { ConfiguracionSistema } from "@/lib/api/config-sistema";

type Estado = "ok" | "advertencia" | "error";

export function SaludSistema({ salud, correo, continuidad }: { salud: SaludSistemaTipo; correo: SaludCorreo; continuidad: ConfiguracionSistema }) {
  const correoConErrores = correo.cola.fallidos + correo.cola.agotados > 0;
  const correoOperativo = correo.habilitado
    && correo.job.activo === true
    && correo.job.vigente === true
    && correo.job.ultimoEstado === "succeeded"
    && !correoConErrores;
  const automatizacionesEstado: Estado = salud.automatizaciones.jobsConFallaActual > 0
    ? "error"
    : salud.automatizaciones.sinEjecuciones > 0
      ? "advertencia"
    : salud.automatizaciones.total > 0 && salud.automatizaciones.activas === salud.automatizaciones.total
      ? "ok"
      : "advertencia";
  const problemasIntegridad = salud.integridad.riesgosPuestoVacante
    + salud.integridad.ncsResponsableInactivo
    + salud.integridad.acusesUsuarioInactivo;
  const estadoRespaldo = calcularEstadoFecha(continuidad.backupUltimoVerificadoFecha, continuidad.backupPeriodicidadDias, true);
  const estadoRestauracion = calcularEstadoFecha(continuidad.restoreUltimaPruebaFecha, continuidad.restorePeriodicidadDias, false);
  const continuidadEstado: Estado = estadoRespaldo.estado === "error"
    ? "error"
    : estadoRestauracion.estado === "ok" ? "ok" : "advertencia";
  const hayError = !salud.baseDatos.operativa || continuidadEstado === "error";
  const hayAdvertencia = !correoOperativo || automatizacionesEstado !== "ok" || problemasIntegridad > 0;

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="salud-sistema-titulo">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Activity className="h-4 w-4" aria-hidden="true" /> Estado operativo
          </p>
          <h2 id="salud-sistema-titulo" className="mt-2 font-serif text-2xl font-semibold">Salud del sistema</h2>
          <p className="mt-1 text-sm text-muted-foreground">Diagnóstico central de infraestructura y automatizaciones.</p>
        </div>
        <EstadoPill estado={hayError ? "error" : hayAdvertencia ? "advertencia" : "ok"} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta icono={CloudCog} titulo="Aplicación" estado="ok" valor="Operativa" detalle={`${capitalizar(salud.despliegue.entorno)}${salud.despliegue.version ? ` · ${salud.despliegue.version.slice(0, 7)}` : ""}`} />
        <Tarjeta icono={Database} titulo="Base de datos" estado={salud.baseDatos.operativa ? "ok" : "error"} valor={salud.baseDatos.operativa ? "Conectada" : "Sin respuesta"} detalle={formatearFecha(salud.baseDatos.horaServidor)} />
        <Tarjeta icono={MailCheck} titulo="Correo" estado={correoOperativo ? "ok" : "advertencia"} valor={correoOperativo ? "Operativo" : "Revisar"} detalle={correo.habilitado ? `${correo.semana.enviados} enviados esta semana` : "Envíos deshabilitados"} />
        <Tarjeta icono={HardDrive} titulo="Almacenamiento" estado="ok" valor={formatearBytes(salud.almacenamiento.bytes)} detalle={`${salud.almacenamiento.objetos} archivo(s)`} />
        <Tarjeta icono={Activity} titulo="Automatizaciones" estado={automatizacionesEstado} valor={salud.automatizaciones.jobsConFallaActual > 0 ? `${salud.automatizaciones.jobsConFallaActual} con falla actual` : `${salud.automatizaciones.activas} de ${salud.automatizaciones.total} activas`} detalle={salud.automatizaciones.recuperadas > 0 ? `${salud.automatizaciones.recuperadas} recuperada(s); historial conservado` : salud.automatizaciones.sinEjecuciones > 0 ? `${salud.automatizaciones.sinEjecuciones} pendiente(s) de primera ejecución` : "Estado actual sin fallas"} />
        <Tarjeta icono={ShieldCheck} titulo="Integridad operativa" estado={problemasIntegridad > 0 ? "advertencia" : "ok"} valor={problemasIntegridad > 0 ? `${problemasIntegridad} punto(s) a corregir` : "Sin observaciones"} detalle={salud.integridad.riesgosPuestoVacante > 0 ? `${salud.integridad.riesgosPuestoVacante} riesgo(s) con puesto vacante` : "Responsables y destinatarios consistentes"} />
        <Tarjeta
          icono={Archive}
          titulo="Respaldo y continuidad"
          estado={continuidadEstado}
          valor={estadoRespaldo.etiqueta}
          detalle={`${continuidad.backupAlcance === "base_datos_y_archivos" ? "Base y archivos" : "Solo base de datos"} · Restauración: ${estadoRestauracion.etiqueta.toLowerCase()}`}
        />
      </div>

      {salud.integridad.alertas.length > 0 && (
        <details className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-amber-900">Ver puntos de integridad operativa</summary>
          <ul className="mt-3 divide-y divide-amber-500/20">
            {salud.integridad.alertas.map((alerta) => (
              <li key={`${alerta.tipo}-${alerta.codigo}`} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{alerta.codigo} — {alerta.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Puesto sin ocupante activo: {alerta.detalle}</p>
                </div>
                <Link href={alerta.url} className="shrink-0 text-xs font-medium text-primary hover:underline">Revisar</Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="mt-4 rounded-lg border border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Ver estado de integraciones</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <IntegracionRow nombre="Supabase" configurada={salud.integraciones.supabaseConfigurada} operativa={salud.baseDatos.operativa} rotacion={continuidad.supabaseRotacionFecha} />
          <IntegracionRow nombre="Vercel" configurada={salud.integraciones.vercelConfigurada} operativa={salud.despliegue.entorno === "production"} rotacion={continuidad.vercelRotacionFecha} />
          <IntegracionRow nombre="Correo" configurada={continuidad.correoEnvioHabilitado && Boolean(continuidad.correoFrom)} operativa={correoOperativo} rotacion={continuidad.correoRotacionFecha} />
          <IntegracionRow nombre="Monitoreo" configurada={salud.integraciones.sentryConfigurado || salud.integraciones.speedInsightsConfigurado} operativa={salud.integraciones.speedInsightsConfigurado} rotacion={continuidad.monitoreoRotacionFecha} detalle={salud.integraciones.sentryConfigurado ? "Sentry y Speed Insights" : "Speed Insights; Sentry sin configurar"} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Responsable: {continuidad.integracionesResponsable || "Sin asignar"}. Los secretos no se exponen en esta pantalla.</p>
      </details>

      {salud.automatizaciones.jobs.length > 0 && (
        <details className="mt-4 rounded-lg border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Ver detalle de automatizaciones</summary>
          <ul className="mt-3 divide-y divide-border">
            {salud.automatizaciones.jobs.map((job) => <AutomatizacionRow key={job.nombre} job={job} />)}
          </ul>
        </details>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">Actualizado {formatearFecha(salud.consultadoEn)}. Las evidencias de continuidad son declaradas y quedan auditadas al guardarse.</p>
    </section>
  );
}

function AutomatizacionRow({ job }: { job: SaludSistemaTipo["automatizaciones"]["jobs"][number] }) {
  const color = job.estadoActual === "operativa" ? "text-emerald-700 bg-emerald-500/10" : job.estadoActual === "recuperada" ? "text-blue-700 bg-blue-500/10" : job.estadoActual === "fallando" ? "text-destructive bg-destructive/10" : "text-amber-700 bg-amber-500/10";
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{job.nombre}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>{traducirEstadoActual(job.estadoActual)}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{job.programacion} · Última: {formatearFecha(job.ultimaEjecucion)}{job.duracionSegundos !== null ? ` · ${formatearDuracion(job.duracionSegundos)}` : ""}</p>
          {job.estadoActual === "recuperada" && <p className="mt-1 text-xs text-blue-700">Falló {formatearFecha(job.ultimoFallo)} y volvió a completar correctamente {formatearFecha(job.ultimoExito)}.</p>}
          {job.estadoActual === "fallando" && job.ultimoMensaje && <p className="mt-1 max-w-xl break-words text-xs text-destructive">{job.ultimoMensaje}</p>}
        </div>
        {job.historial.length > 0 && (
          <details className="shrink-0 sm:text-right">
            <summary className="cursor-pointer text-xs font-medium text-primary">Últimas ejecuciones</summary>
            <ul className="mt-2 min-w-64 space-y-1 text-left">
              {job.historial.map((ejecucion, indice) => (
                <li key={`${ejecucion.inicio}-${indice}`} className="rounded bg-muted/40 px-2 py-1.5 text-xs">
                  <span className={ejecucion.estado === "succeeded" ? "text-emerald-700" : ejecucion.estado === "running" ? "text-amber-700" : "text-destructive"}>{traducirEstado(ejecucion.estado)}</span>
                  <span className="text-muted-foreground"> · {formatearFecha(ejecucion.inicio)}{ejecucion.duracionSegundos !== null ? ` · ${formatearDuracion(ejecucion.duracionSegundos)}` : ""}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

function Tarjeta({ icono: Icono, titulo, estado, valor, detalle }: { icono: typeof Activity; titulo: string; estado: Estado; valor: string; detalle: string }) {
  const color = estado === "ok" ? "text-emerald-700 bg-emerald-500/10" : estado === "error" ? "text-destructive bg-destructive/10" : "text-amber-700 bg-amber-500/10";
  return (
    <article className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}><Icono className="h-4 w-4" aria-hidden="true" /></span>
        {estado === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Correcto" /> : <CircleAlert className={`h-4 w-4 ${estado === "error" ? "text-destructive" : "text-amber-600"}`} aria-label="Revisar" />}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 font-semibold">{valor}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalle}</p>
    </article>
  );
}

function IntegracionRow({ nombre, configurada, operativa, rotacion, detalle }: { nombre: string; configurada: boolean; operativa: boolean; rotacion: string; detalle?: string }) {
  const estado: Estado = !configurada ? "advertencia" : operativa ? "ok" : "error";
  const texto = !configurada ? "Configuración incompleta" : operativa ? "Operativa" : "Revisar";
  const rotacionTexto = !rotacion ? "Rotación sin planificar" : new Date(`${rotacion}T12:00:00Z`).getTime() < Date.now() ? "Rotación vencida" : `Revisar ${formatearSoloFecha(rotacion)}`;
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${estado === "ok" ? "bg-emerald-500/10 text-emerald-700" : estado === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}><Cable className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0"><p className="text-sm font-medium">{nombre} · {texto}</p><p className="text-xs text-muted-foreground">{detalle ?? rotacionTexto}{detalle ? ` · ${rotacionTexto}` : ""}</p></div>
    </div>
  );
}

function EstadoPill({ estado }: { estado: Estado }) {
  const texto = estado === "ok" ? "Todo operativo" : estado === "error" ? "Requiere atención" : "Hay puntos a revisar";
  const color = estado === "ok" ? "bg-emerald-500/10 text-emerald-700" : estado === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700";
  return <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${color}`}>{texto}</span>;
}

function formatearFecha(valor?: string | null) {
  if (!valor) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(valor));
}

function formatearBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatearSoloFecha(valor: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(`${valor}T12:00:00Z`));
}

function traducirEstado(estado?: string | null) {
  if (estado === "succeeded") return "Completada";
  if (estado === "failed") return "Fallida";
  if (estado === "running") return "En curso";
  return "Sin ejecución";
}

function traducirEstadoActual(estado: SaludSistemaTipo["automatizaciones"]["jobs"][number]["estadoActual"]) {
  if (estado === "operativa") return "Operativa";
  if (estado === "recuperada") return "Recuperada";
  if (estado === "fallando") return "Falla actual";
  if (estado === "en_curso") return "En curso";
  if (estado === "sin_ejecuciones") return "Primera ejecución pendiente";
  return "Inactiva";
}

function formatearDuracion(segundos: number) {
  if (segundos < 1) return `${Math.round(segundos * 1000)} ms`;
  return `${segundos.toFixed(1)} s`;
}

function capitalizar(valor: string) {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function calcularEstadoFecha(fecha: string, periodicidadDias: number, esRespaldo: boolean): { estado: Estado; etiqueta: string } {
  if (!fecha) return { estado: esRespaldo ? "error" : "advertencia", etiqueta: "Sin evidencia" };
  const instante = new Date(`${fecha}T12:00:00Z`).getTime();
  if (Number.isNaN(instante)) return { estado: "error", etiqueta: "Fecha inválida" };
  const antiguedad = Math.max(0, Math.floor((Date.now() - instante) / 86_400_000));
  if (antiguedad > periodicidadDias) return { estado: esRespaldo ? "error" : "advertencia", etiqueta: `Vencido hace ${antiguedad - periodicidadDias} día(s)` };
  return { estado: "ok", etiqueta: antiguedad === 0 ? "Verificado hoy" : `Verificado hace ${antiguedad} día(s)` };
}
