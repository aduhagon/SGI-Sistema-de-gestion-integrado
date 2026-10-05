"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Boxes,
  Scale,
  Mail,
  Send,
  TimerReset,
  Check,
  Loader2,
  Lock,
  AlertCircle,
  ArchiveRestore,
  Cable,
} from "lucide-react";
import type {
  ConfiguracionSistema,
  ModuloSistema,
} from "@/lib/api/config-sistema";
import type { SaludCorreo as SaludCorreoTipo } from "@/lib/api/correo-salud";
import {
  configurarResumenSemanal,
  enviarCorreoPrueba,
  setConfiguracion,
  setModulo,
} from "@/app/(app)/sistema/config-actions";
import { SaludCorreo } from "@/components/sistema/SaludCorreo";

type Props = {
  config: ConfiguracionSistema;
  modulos: ModuloSistema[];
  normasDisponibles: { codigo: string; nombre: string }[];
  saludCorreo: SaludCorreoTipo;
};

export function PanelConfiguracion({ config, modulos, normasDisponibles, saludCorreo }: Props) {
  return (
    <div className="space-y-8">
      <SeccionOrganizacion config={config} />
      <SeccionModulos modulos={modulos} />
      <SeccionNormas config={config} normasDisponibles={normasDisponibles} />
      <SeccionReglasOperativas config={config} />
      <SeccionContinuidad config={config} />
      <SeccionIntegraciones config={config} />
      <SeccionCorreo config={config} salud={saludCorreo} />
    </div>
  );
}

/* ----- Integraciones ----- */
function SeccionIntegraciones({ config }: { config: ConfiguracionSistema }) {
  const router = useRouter();
  const [responsable, setResponsable] = useState(config.integracionesResponsable);
  const [supabase, setSupabase] = useState(config.supabaseRotacionFecha);
  const [vercel, setVercel] = useState(config.vercelRotacionFecha);
  const [correo, setCorreo] = useState(config.correoRotacionFecha);
  const [monitoreo, setMonitoreo] = useState(config.monitoreoRotacionFecha);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();

  function guardar() {
    setEstado(null);
    setMensaje("");
    start(async () => {
      for (const [clave, valor] of [
        ["integraciones_responsable", responsable],
        ["supabase_rotacion_fecha", supabase],
        ["vercel_rotacion_fecha", vercel],
        ["correo_rotacion_fecha", correo],
        ["monitoreo_rotacion_fecha", monitoreo],
      ] as const) {
        const resultado = await setConfiguracion(clave, valor);
        if (!resultado.ok) {
          setEstado("error");
          setMensaje(resultado.error);
          return;
        }
      }
      setEstado("ok");
      setMensaje("Gobierno de integraciones actualizado.");
      router.refresh();
    });
  }

  return (
    <Bloque icon={<Cable className="h-5 w-5" />} titulo="Integraciones y credenciales" descripcion="Responsable y calendario de revisión. Las claves permanecen en los gestores de secretos y nunca se muestran aquí.">
      <div className="space-y-1.5">
        <label htmlFor="integraciones-responsable" className="text-sm font-medium">Responsable técnico</label>
        <input id="integraciones-responsable" type="email" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="soporte@empresa.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CampoFechaRotacion id="rotacion-supabase" etiqueta="Supabase" valor={supabase} onChange={setSupabase} />
        <CampoFechaRotacion id="rotacion-vercel" etiqueta="Vercel" valor={vercel} onChange={setVercel} />
        <CampoFechaRotacion id="rotacion-correo" etiqueta="Proveedor de correo" valor={correo} onChange={setCorreo} />
        <CampoFechaRotacion id="rotacion-monitoreo" etiqueta="Monitoreo / Sentry" valor={monitoreo} onChange={setMonitoreo} />
      </div>
      <div className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Estas fechas son recordatorios de gobierno. No modifican ni rotan automáticamente ninguna credencial.
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
        </button>
        <MensajeGuardado estado={estado} />
      </div>
      {mensaje && <p role="status" className={`mt-2 text-xs ${estado === "error" ? "text-destructive" : "text-emerald-700"}`}>{mensaje}</p>}
    </Bloque>
  );
}

function CampoFechaRotacion({ id, etiqueta, valor, onChange }: { id: string; etiqueta: string; valor: string; onChange: (valor: string) => void }) {
  return <div className="space-y-1.5"><label htmlFor={id} className="text-sm font-medium">Próxima revisión · {etiqueta}</label><input id={id} type="date" min={fechaHoy()} value={valor} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><p className="text-xs text-muted-foreground">Vacío significa que aún no fue planificada.</p></div>;
}

/* ----- Respaldo y continuidad ----- */
function SeccionContinuidad({ config }: { config: ConfiguracionSistema }) {
  const router = useRouter();
  const [backupFecha, setBackupFecha] = useState(config.backupUltimoVerificadoFecha);
  const [backupDias, setBackupDias] = useState(config.backupPeriodicidadDias);
  const [alcance, setAlcance] = useState(config.backupAlcance);
  const [restoreFecha, setRestoreFecha] = useState(config.restoreUltimaPruebaFecha);
  const [restoreDias, setRestoreDias] = useState(config.restorePeriodicidadDias);
  const [responsable, setResponsable] = useState(config.continuidadResponsable);
  const [procedimiento, setProcedimiento] = useState(config.continuidadProcedimientoUrl);
  const [alertas, setAlertas] = useState(config.continuidadAlertasHabilitadas);
  const [repetirDias, setRepetirDias] = useState(config.continuidadAlertaRepetirDias);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();

  function guardar() {
    setEstado(null);
    setMensaje("");
    start(async () => {
      for (const [clave, valor] of [
        ["backup_ultimo_verificado_fecha", backupFecha],
        ["backup_periodicidad_dias", backupDias],
        ["backup_alcance", alcance],
        ["restore_ultima_prueba_fecha", restoreFecha],
        ["restore_periodicidad_dias", restoreDias],
        ["continuidad_responsable", responsable],
        ["continuidad_procedimiento_url", procedimiento],
        ["continuidad_alertas_habilitadas", alertas],
        ["continuidad_alerta_repetir_dias", repetirDias],
      ] as const) {
        const resultado = await setConfiguracion(clave, valor);
        if (!resultado.ok) {
          setEstado("error");
          setMensaje(resultado.error);
          return;
        }
      }
      setEstado("ok");
      setMensaje("Evidencias y umbrales de continuidad actualizados.");
      router.refresh();
    });
  }

  return (
    <Bloque icon={<ArchiveRestore className="h-5 w-5" />} titulo="Respaldo y continuidad" descripcion="Registrá evidencia verificable y la vigencia esperada. Guardar una fecha no ejecuta un backup ni una restauración.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="backup-fecha" className="text-sm font-medium">Último respaldo verificado</label>
          <input id="backup-fecha" type="date" max={fechaHoy()} value={backupFecha} onChange={(e) => setBackupFecha(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Fecha comprobada en el proveedor o evidencia externa.</p>
        </div>
        <CampoDias id="backup-dias" etiqueta="Frecuencia esperada" valor={backupDias} onChange={setBackupDias} ayuda="Antigüedad máxima aceptable." minimo={1} maximo={365} />
        <div className="space-y-1.5">
          <label htmlFor="backup-alcance" className="text-sm font-medium">Alcance verificado</label>
          <select id="backup-alcance" value={alcance} onChange={(e) => setAlcance(e.target.value as typeof alcance)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="base_datos">Solo base de datos</option>
            <option value="base_datos_y_archivos">Base de datos y archivos</option>
          </select>
          <p className="text-xs text-muted-foreground">Los archivos de Storage deben verificarse por separado.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="continuidad-responsable" className="text-sm font-medium">Responsable técnico</label>
          <input id="continuidad-responsable" type="email" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="soporte@empresa.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="restore-fecha" className="text-sm font-medium">Última prueba de restauración</label>
          <input id="restore-fecha" type="date" max={fechaHoy()} value={restoreFecha} onChange={(e) => setRestoreFecha(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Fecha en que se comprobó que el respaldo podía recuperarse.</p>
        </div>
        <CampoDias id="restore-dias" etiqueta="Vigencia de la prueba" valor={restoreDias} onChange={setRestoreDias} ayuda="Frecuencia máxima entre simulacros." minimo={30} maximo={730} />
      </div>
      <div className="mt-4 space-y-1.5">
        <label htmlFor="continuidad-url" className="text-sm font-medium">Procedimiento de recuperación</label>
        <input id="continuidad-url" type="url" value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} placeholder="https://…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
        <label className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium">Alertas automáticas de continuidad</span>
            <p className="text-xs text-muted-foreground">Revisión diaria; solo envía si encuentra evidencia faltante o vencida.</p>
          </div>
          <button type="button" role="switch" aria-checked={alertas} onClick={() => setAlertas((valor) => !valor)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${alertas ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${alertas ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </label>
        {alertas && (
          <div className="mt-3 max-w-sm">
            <CampoDias id="continuidad-repetir" etiqueta="Repetir como máximo cada" valor={repetirDias} onChange={setRepetirDias} ayuda="Evita correos diarios por el mismo estado." minimo={1} maximo={30} />
          </div>
        )}
      </div>
      <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">
        Esta sección registra evidencia y genera el semáforo. No reemplaza la comprobación en Supabase ni una prueba real de restauración.
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar evidencia
        </button>
        <MensajeGuardado estado={estado} />
      </div>
      {mensaje && <p role="status" className={`mt-2 text-xs ${estado === "error" ? "text-destructive" : "text-emerald-700"}`}>{mensaje}</p>}
    </Bloque>
  );
}

/* ----- Reglas operativas ----- */
function SeccionReglasOperativas({ config }: { config: ConfiguracionSistema }) {
  const router = useRouter();
  const [aprobacion, setAprobacion] = useState(config.aprobacionPlazoDiasDefault);
  const [nc, setNc] = useState(config.ncPlazoCierreDiasDefault);
  const [requisitos, setRequisitos] = useState(config.requisitosAlertaDias);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();

  function guardar() {
    setEstado(null);
    setMensaje("");
    start(async () => {
      const valores = [
        ["aprobacion_plazo_dias_default", aprobacion],
        ["nc_plazo_cierre_dias_default", nc],
        ["requisitos_alerta_dias", requisitos],
      ] as const;
      for (const [clave, valor] of valores) {
        const resultado = await setConfiguracion(clave, valor);
        if (!resultado.ok) {
          setEstado("error");
          setMensaje(resultado.error);
          return;
        }
      }
      setEstado("ok");
      setMensaje("Los nuevos valores se aplicarán a las próximas operaciones.");
      router.refresh();
    });
  }

  return (
    <Bloque icon={<TimerReset className="h-5 w-5" />} titulo="Plazos y avisos" descripcion="Valores predeterminados para nuevas operaciones. Cero conserva el campo sin fecha automática.">
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoDias id="plazo-aprobacion" etiqueta="Aprobación documental" valor={aprobacion} onChange={setAprobacion} ayuda="Plazo sugerido si el usuario no indica otro." />
        <CampoDias id="plazo-nc" etiqueta="Cierre de NC" valor={nc} onChange={setNc} ayuda="Fecha límite automática para nuevas NC." />
        <CampoDias id="aviso-requisitos" etiqueta="Aviso legal anticipado" valor={requisitos} onChange={setRequisitos} ayuda="Cuándo aparece una próxima evaluación." minimo={1} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
        </button>
        <MensajeGuardado estado={estado} />
      </div>
      {mensaje && <p role="status" className={`mt-2 text-xs ${estado === "error" ? "text-destructive" : "text-emerald-700"}`}>{mensaje}</p>}
    </Bloque>
  );
}

function CampoDias({ id, etiqueta, valor, onChange, ayuda, minimo = 0, maximo = 90 }: { id: string; etiqueta: string; valor: number; onChange: (valor: number) => void; ayuda: string; minimo?: number; maximo?: number }) {
  return <div className="space-y-1.5"><label htmlFor={id} className="text-sm font-medium">{etiqueta}</label><div className="flex items-center gap-2"><input id={id} type="number" min={minimo} max={maximo} value={valor} onChange={(e) => onChange(Math.max(minimo, Math.min(maximo, Number(e.target.value))))} className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" /><span className="text-sm text-muted-foreground">días</span></div><p className="text-xs text-muted-foreground">{ayuda}</p></div>;
}

function fechaHoy() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function Bloque({
  icon,
  titulo,
  descripcion,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MensajeGuardado({ estado }: { estado: "ok" | "error" | null; texto?: string }) {
  if (!estado) return null;
  return estado === "ok" ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <Check className="h-3.5 w-3.5" /> Guardado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5" /> Error
    </span>
  );
}

/* ----- Organización ----- */
function SeccionOrganizacion({ config }: { config: ConfiguracionSistema }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(config.orgNombre);
  const [logo, setLogo] = useState(config.orgLogoUrl);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [pending, start] = useTransition();

  function guardar() {
    setEstado(null);
    start(async () => {
      const r1 = await setConfiguracion("org_nombre", nombre);
      const r2 = await setConfiguracion("org_logo_url", logo);
      setEstado(r1.ok && r2.ok ? "ok" : "error");
      if (r1.ok && r2.ok) router.refresh();
    });
  }

  return (
    <Bloque
      icon={<Building2 className="h-5 w-5" />}
      titulo="Organización"
      descripcion="Datos básicos de la empresa que usa el sistema."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="org-nombre" className="text-sm font-medium">Nombre</label>
          <input
            id="org-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="org-logo" className="text-sm font-medium">URL del logo</label>
          <input
            id="org-logo"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <MensajeGuardado estado={estado} />
        </div>
      </div>
    </Bloque>
  );
}

/* ----- Módulos ----- */
function SeccionModulos({ modulos }: { modulos: ModuloSistema[] }) {
  return (
    <Bloque
      icon={<Boxes className="h-5 w-5" />}
      titulo="Módulos"
      descripcion="Activá o desactivá las áreas del sistema. Los módulos núcleo no se pueden desactivar."
    >
      <ul className="divide-y divide-border">
        {modulos.map((m) => (
          <ModuloRow key={m.codigo} modulo={m} />
        ))}
      </ul>
    </Bloque>
  );
}

function ModuloRow({ modulo }: { modulo: ModuloSistema }) {
  const router = useRouter();
  const [on, setOn] = useState(modulo.habilitado);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    if (modulo.nucleo) return;
    const nuevo = !on;
    setOn(nuevo);
    setEstado(null);
    start(async () => {
      const r = await setModulo(modulo.codigo, nuevo);
      if (!r.ok) {
        setOn(!nuevo); // revertir
        setEstado("error");
      } else {
        setEstado("ok");
        router.refresh();
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{modulo.nombre}</span>
          {modulo.nucleo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" /> Núcleo
            </span>
          )}
        </div>
        {modulo.descripcion && (
          <p className="text-xs text-muted-foreground">{modulo.descripcion}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MensajeGuardado estado={estado} />
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={modulo.nucleo || pending}
          className={
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
            (on ? "bg-emerald-500" : "bg-muted-foreground/30") +
            (modulo.nucleo ? " opacity-50 cursor-not-allowed" : "")
          }
        >
          <span
            className={
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
              (on ? "translate-x-6" : "translate-x-1")
            }
          />
        </button>
      </div>
    </li>
  );
}

/* ----- Normas / multinorma ----- */
function SeccionNormas({
  config,
  normasDisponibles,
}: {
  config: ConfiguracionSistema;
  normasDisponibles: { codigo: string; nombre: string }[];
}) {
  const router = useRouter();
  const [multinorma, setMultinorma] = useState(config.multinorma);
  const [activas, setActivas] = useState<string[]>(config.normasActivas);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [pending, start] = useTransition();

  function toggleNorma(codigo: string) {
    setActivas((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    );
  }

  function guardar() {
    setEstado(null);
    start(async () => {
      const r1 = await setConfiguracion("multinorma", multinorma);
      const r2 = await setConfiguracion("normas_activas", activas);
      setEstado(r1.ok && r2.ok ? "ok" : "error");
      if (r1.ok && r2.ok) router.refresh();
    });
  }

  return (
    <Bloque
      icon={<Scale className="h-5 w-5" />}
      titulo="Normas"
      descripcion="Definí si el sistema gestiona varias normas o una sola, y cuáles están activas."
    >
      <div className="space-y-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium">Sistema multinorma</span>
            <p className="text-xs text-muted-foreground">
              Si está activo, podés gestionar y comparar varias normas a la vez.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={multinorma}
            onClick={() => setMultinorma((v) => !v)}
            className={
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
              (multinorma ? "bg-emerald-500" : "bg-muted-foreground/30")
            }
          >
            <span
              className={
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                (multinorma ? "translate-x-6" : "translate-x-1")
              }
            />
          </button>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Normas activas</p>
          <div className="flex flex-wrap gap-2">
            {normasDisponibles.map((n) => {
              const sel = activas.includes(n.codigo);
              return (
                <button
                  key={n.codigo}
                  type="button"
                  onClick={() => toggleNorma(n.codigo)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (sel
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                      : "border-border text-muted-foreground hover:bg-muted/50")
                  }
                >
                  {sel && <Check className="h-3 w-3" />}
                  {n.codigo}
                </button>
              );
            })}
          </div>
          {!multinorma && activas.length > 1 && (
            <p className="mt-2 text-xs text-amber-600">
              El sistema está en modo de una sola norma, pero hay varias activas.
              Dejá solo una para coherencia.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <MensajeGuardado estado={estado} />
        </div>

      </div>
    </Bloque>
  );
}

/* ----- Correo ----- */
function SeccionCorreo({ config, salud }: { config: ConfiguracionSistema; salud: SaludCorreoTipo }) {
  const router = useRouter();
  const [habilitado, setHabilitado] = useState(config.correoEnvioHabilitado);
  const [from, setFrom] = useState(config.correoFrom);
  const [nombre, setNombre] = useState(config.correoRemitenteNombre);
  const [replyTo, setReplyTo] = useState(config.correoReplyTo);
  const [responsable, setResponsable] = useState(config.correoResponsableSgi);
  const [alertas, setAlertas] = useState(config.correoAlertasTecnicas);
  const [dia, setDia] = useState(config.resumenSemanalDia);
  const [hora, setHora] = useState(config.resumenSemanalHora);
  const [destinoPrueba, setDestinoPrueba] = useState(config.correoAlertasTecnicas || config.correoResponsableSgi);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  const [probando, startPrueba] = useTransition();

  function guardar() {
    setEstado(null);
    start(async () => {
      // Guardar en serie conserva el encadenamiento cronológico de la bitácora.
      const resultados = [];
      for (const [clave, valor] of [
        ["correo_envio_habilitado", habilitado],
        ["correo_from", from],
        ["correo_remitente_nombre", nombre],
        ["correo_reply_to", replyTo],
        ["correo_responsable_sgi", responsable],
        ["correo_alertas_tecnicas", alertas],
      ] as const) {
        resultados.push(await setConfiguracion(clave, valor));
      }
      resultados.push(await configurarResumenSemanal(dia, hora));
      const fallo = resultados.find((resultado) => !resultado.ok);
      setEstado(fallo ? "error" : "ok");
      setMensaje(fallo && "error" in fallo ? fallo.error : "Configuración y programación actualizadas.");
      if (!fallo) router.refresh();
    });
  }

  function probar() {
    setMensaje("");
    startPrueba(async () => {
      const resultado = await enviarCorreoPrueba(destinoPrueba);
      setEstado(resultado.ok ? "ok" : "error");
      setMensaje(resultado.ok ? resultado.mensaje : resultado.error);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <Bloque
      icon={<Mail className="h-5 w-5" />}
      titulo="Correo del sistema"
      descripcion="Casilla remitente para las notificaciones (ej: alertas de vencimientos)."
    >
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium">Envío de correos habilitado</span>
            <p className="text-xs text-muted-foreground">
              Si está activo, el sistema envía notificaciones por email.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={habilitado}
            onClick={() => setHabilitado((v) => !v)}
            className={
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
              (habilitado ? "bg-emerald-500" : "bg-muted-foreground/30")
            }
          >
            <span
              className={
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                (habilitado ? "translate-x-6" : "translate-x-1")
              }
            />
          </button>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="correo-from" className="text-sm font-medium">Dirección remitente</label>
          <input
            id="correo-from"
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="sgi@empresa.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="correo-reply-to" className="text-sm font-medium">Responder a</label>
            <input id="correo-reply-to" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="calidad@empresa.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground">Dirección que recibirá las respuestas de los usuarios.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="correo-responsable" className="text-sm font-medium">Responsable del SGI</label>
            <input id="correo-responsable" type="email" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="responsable.sgi@empresa.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground">Contacto funcional de referencia del sistema.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="correo-alertas" className="text-sm font-medium">Alertas técnicas</label>
          <input id="correo-alertas" type="email" value={alertas} onChange={(e) => setAlertas(e.target.value)} placeholder="soporte@empresa.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Recibe avisos por fallas reiteradas de las automatizaciones.</p>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">Resumen semanal</h3>
          <p className="mt-1 text-xs text-muted-foreground">Programación según la zona horaria general del sistema.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="resumen-dia" className="text-sm font-medium">Día</label>
              <select id="resumen-dia" value={dia} onChange={(e) => setDia(Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value={1}>Lunes</option><option value={2}>Martes</option><option value={3}>Miércoles</option><option value={4}>Jueves</option><option value={5}>Viernes</option><option value={6}>Sábado</option><option value={7}>Domingo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="resumen-hora" className="text-sm font-medium">Hora</label>
              <input id="resumen-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="correo-nombre" className="text-sm font-medium">Nombre del remitente</label>
          <input
            id="correo-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="SGI MSU"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
          La contraseña / clave de la casilla NO se guarda acá por seguridad. Se
          configura en los secretos de Supabase (lo vemos al activar el envío real).
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <MensajeGuardado estado={estado} />
        </div>
        {mensaje && <p role="status" className={`text-xs ${estado === "error" ? "text-destructive" : "text-emerald-700"}`}>{mensaje}</p>}

        <div className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Probar configuración</h3>
          <p className="mt-1 text-xs text-muted-foreground">Encola un correo real para comprobar proveedor, remitente y entrega.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="email" aria-label="Destinatario de prueba" value={destinoPrueba} onChange={(e) => setDestinoPrueba(e.target.value)} placeholder="destinatario@empresa.com" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button type="button" onClick={probar} disabled={probando || !destinoPrueba} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-primary px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60">
              {probando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar prueba
            </button>
          </div>
        </div>
        <SaludCorreo salud={salud} />
      </div>
    </Bloque>
  );
}
