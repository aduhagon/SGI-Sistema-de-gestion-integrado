"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react";
import type { SaludCorreo as SaludCorreoTipo } from "@/lib/api/correo-salud";
import { reintentarCorreosSemana } from "@/app/(app)/sistema/config-actions";

export function SaludCorreo({ salud }: { salud: SaludCorreoTipo }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const erroresSemana = salud.semana.fallidos + salud.semana.agotados;
  const erroresGlobales = salud.cola.fallidos + salud.cola.agotados;
  const saludable = salud.habilitado
    && salud.job.activo
    && salud.job.ultimoEstado === "succeeded"
    && salud.job.vigente === true
    && erroresGlobales === 0;

  function reintentar() {
    setMensaje(null);
    startTransition(async () => {
      const resultado = await reintentarCorreosSemana();
      if (!resultado.ok) {
        setMensaje({ tipo: "error", texto: resultado.error });
        return;
      }
      setMensaje({ tipo: "ok", texto: resultado.mensaje });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${saludable ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
            {saludable ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <AlertCircle className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div>
            <h3 className="text-sm font-semibold">Salud de las automatizaciones</h3>
            <p className="text-xs text-muted-foreground">
              {saludable ? "El resumen semanal y la cola funcionan normalmente." : "Hay una condición que requiere revisión."}
            </p>
          </div>
        </div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${saludable ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
          {saludable ? "Operativo" : "Revisar"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica etiqueta="Enviados esta semana" valor={salud.semana.enviados} />
        <Metrica etiqueta="Pendientes" valor={salud.semana.pendientes} alerta={salud.semana.pendientes > 0} />
        <Metrica etiqueta="Fallidos en cola" valor={erroresGlobales} alerta={erroresGlobales > 0} />
        <Metrica etiqueta="Próxima ejecución" valor={formatearProximaEjecucion(salud.job.proximaEjecucion)} />
      </dl>

      <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Última ejecución
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatearFecha(salud.job.ultimaEjecucion)} · {traducirEstado(salud.job.ultimoEstado)}
        </p>
        {salud.job.ultimoEstado === "succeeded" && salud.job.vigente === false && (
          <p className="mt-2 rounded bg-amber-500/10 px-2 py-1.5 text-amber-800">
            La última ejecución exitosa está fuera del período esperado.
          </p>
        )}
        {salud.job.ultimoEstado === "failed" && salud.job.ultimoMensaje && (
          <p className="mt-2 break-words rounded bg-destructive/5 px-2 py-1.5 text-destructive">{salud.job.ultimoMensaje}</p>
        )}
      </div>

      {erroresSemana > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-amber-800">Hay {erroresSemana} correo(s) de esta semana sin entregar.</p>
          <p className="mt-1 text-xs text-amber-700">El reintento conserva los correos enviados y recupera únicamente los fallidos.</p>
          <button type="button" onClick={reintentar} disabled={pending} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Reintentar fallidos
          </button>
        </div>
      )}

      {mensaje && (
        <p role="status" className={`text-xs ${mensaje.tipo === "ok" ? "text-emerald-700" : "text-destructive"}`}>{mensaje.texto}</p>
      )}

      {salud.fallosRecientes.length > 0 && (
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium">Ver últimos errores históricos</summary>
          <ul className="mt-3 space-y-2">
            {salud.fallosRecientes.map((fallo) => (
              <li key={fallo.id} className="rounded bg-muted/40 px-2.5 py-2 text-xs">
                <div className="flex flex-wrap justify-between gap-2 font-medium"><span>{fallo.destinatario}</span><span className="text-destructive">{fallo.estado}</span></div>
                <p className="mt-1 text-muted-foreground">{formatearFecha(fallo.creadoEn)} · {fallo.intentos} intento(s)</p>
                {fallo.error && <p className="mt-1 break-words text-muted-foreground">{fallo.error}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Metrica({ etiqueta, valor, alerta = false }: { etiqueta: string; valor: string | number; alerta?: boolean }) {
  return <div className="rounded-md border border-border px-3 py-2"><dt className="text-[11px] text-muted-foreground">{etiqueta}</dt><dd className={`mt-1 text-lg font-semibold tabular-nums ${alerta ? "text-amber-700" : "text-foreground"}`}>{valor}</dd></div>;
}

function formatearFecha(valor?: string | null) {
  if (!valor) return "Sin ejecuciones registradas";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(valor));
}

function formatearProximaEjecucion(valor?: string | null) {
  if (!valor) return "Sin programación";
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(valor));
}

function traducirEstado(estado?: string | null) {
  if (estado === "succeeded") return "Completada";
  if (estado === "failed") return "Fallida";
  if (estado === "running") return "En curso";
  return "Sin estado";
}
