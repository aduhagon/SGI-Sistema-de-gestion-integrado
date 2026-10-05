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
} from "lucide-react";
import type { SaludCorreo } from "@/lib/api/correo-salud";
import type { SaludSistema as SaludSistemaTipo } from "@/lib/api/sistema-salud";

type Estado = "ok" | "advertencia" | "error";

export function SaludSistema({ salud, correo }: { salud: SaludSistemaTipo; correo: SaludCorreo }) {
  const correoConErrores = correo.cola.fallidos + correo.cola.agotados > 0;
  const correoOperativo = correo.habilitado
    && correo.job.activo === true
    && correo.job.vigente === true
    && correo.job.ultimoEstado === "succeeded"
    && !correoConErrores;
  const automatizacionesEstado: Estado = salud.automatizaciones.fallosSieteDias > 0
    ? "advertencia"
    : salud.automatizaciones.total > 0 && salud.automatizaciones.activas === salud.automatizaciones.total
      ? "ok"
      : "advertencia";
  const problemasIntegridad = salud.integridad.riesgosPuestoVacante
    + salud.integridad.ncsResponsableInactivo
    + salud.integridad.acusesUsuarioInactivo;
  const hayError = !salud.baseDatos.operativa;
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
        <Tarjeta icono={Activity} titulo="Automatizaciones" estado={automatizacionesEstado} valor={`${salud.automatizaciones.activas} de ${salud.automatizaciones.total} activas`} detalle={salud.automatizaciones.fallosSieteDias > 0 ? `${salud.automatizaciones.fallosSieteDias} fallo(s) en 7 días` : "Sin fallos en 7 días"} />
        <Tarjeta icono={ShieldCheck} titulo="Integridad operativa" estado={problemasIntegridad > 0 ? "advertencia" : "ok"} valor={problemasIntegridad > 0 ? `${problemasIntegridad} punto(s) a corregir` : "Sin observaciones"} detalle={salud.integridad.riesgosPuestoVacante > 0 ? `${salud.integridad.riesgosPuestoVacante} riesgo(s) con puesto vacante` : "Responsables y destinatarios consistentes"} />
        <Tarjeta icono={Archive} titulo="Respaldo" estado="advertencia" valor="Sin integración" detalle="La fecha del último backup aún no se puede verificar aquí" />
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

      {salud.automatizaciones.jobs.length > 0 && (
        <details className="mt-4 rounded-lg border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Ver detalle de automatizaciones</summary>
          <ul className="mt-3 divide-y divide-border">
            {salud.automatizaciones.jobs.map((job) => (
              <li key={job.nombre} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{job.nombre}</p>
                  <p className="text-xs text-muted-foreground">{job.programacion} · {job.activa ? "Activa" : "Inactiva"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{traducirEstado(job.ultimoEstado)} · {formatearFecha(job.ultimaEjecucion)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">Actualizado {formatearFecha(salud.consultadoEn)}. El respaldo figura como pendiente hasta conectar una fuente verificable.</p>
    </section>
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

function traducirEstado(estado?: string | null) {
  if (estado === "succeeded") return "Completada";
  if (estado === "failed") return "Fallida";
  if (estado === "running") return "En curso";
  return "Sin ejecución";
}

function capitalizar(valor: string) {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}
