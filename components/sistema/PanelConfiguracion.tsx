"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Boxes,
  Scale,
  Mail,
  Check,
  Loader2,
  Lock,
  AlertCircle,
} from "lucide-react";
import type {
  ConfiguracionSistema,
  ModuloSistema,
} from "@/lib/api/config-sistema";
import { setConfiguracion, setModulo } from "@/app/(app)/sistema/config-actions";

type Props = {
  config: ConfiguracionSistema;
  modulos: ModuloSistema[];
  normasDisponibles: { codigo: string; nombre: string }[];
};

export function PanelConfiguracion({ config, modulos, normasDisponibles }: Props) {
  return (
    <div className="space-y-8">
      <SeccionOrganizacion config={config} />
      <SeccionModulos modulos={modulos} />
      <SeccionNormas config={config} normasDisponibles={normasDisponibles} />
      <SeccionCorreo config={config} />
    </div>
  );
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
function SeccionCorreo({ config }: { config: ConfiguracionSistema }) {
  const router = useRouter();
  const [habilitado, setHabilitado] = useState(config.correoEnvioHabilitado);
  const [from, setFrom] = useState(config.correoFrom);
  const [nombre, setNombre] = useState(config.correoRemitenteNombre);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);
  const [pending, start] = useTransition();

  function guardar() {
    setEstado(null);
    start(async () => {
      const r1 = await setConfiguracion("correo_envio_habilitado", habilitado);
      const r2 = await setConfiguracion("correo_from", from);
      const r3 = await setConfiguracion("correo_remitente_nombre", nombre);
      setEstado(r1.ok && r2.ok && r3.ok ? "ok" : "error");
      if (r1.ok && r2.ok && r3.ok) router.refresh();
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
      </div>
    </Bloque>
  );
}
