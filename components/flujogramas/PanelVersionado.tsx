"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  publicarVersionFlujo, obtenerEstadoVersionado,
  type EstadoVersionado,
} from "@/app/(app)/flujogramas/actions";

export function PanelVersionado({ procesoFlujoId }: { procesoFlujoId: string }) {
  const [estado, setEstado] = useState<EstadoVersionado | null>(null);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    obtenerEstadoVersionado(procesoFlujoId).then((e) => { if (vivo) setEstado(e); });
    return () => { vivo = false; };
  }, [procesoFlujoId]);

  function publicar() {
    start(async () => {
      const r = await publicarVersionFlujo(procesoFlujoId, motivo);
      if (r.ok) {
        setMsg({ ok: true, texto: `Versión ${r.numeroVersion} publicada como ${r.documentoCodigo}. Ahora sigue el ciclo de aprobación documental.` });
        setMotivo("");
        const e = await obtenerEstadoVersionado(procesoFlujoId);
        setEstado(e);
      } else {
        setMsg({ ok: false, texto: r.error });
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{abierto ? "▾" : "▸"}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versión del flujograma</span>
        </span>
        <span className="flex items-center gap-2 text-xs">
          {estado?.tieneVersiones ? (
            <>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">v{estado.ultimaVersion}</span>
              {estado.hayCambiosSinPublicar && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">cambios sin publicar</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">sin publicar</span>
          )}
        </span>
      </button>

      {abierto && (
        <div className="mt-3 border-t border-border pt-3">
          {estado?.tieneVersiones && (
            <p className="mb-2 text-sm text-muted-foreground">
              Última versión publicada: <span className="font-medium text-foreground">v{estado.ultimaVersion}</span>
              {estado.documentoCodigo && (
                <>
                  {" · "}
                  <Link href={`/documentos`} className="text-primary underline underline-offset-2">
                    {estado.documentoCodigo}
                  </Link>
                </>
              )}
            </p>
          )}

          {estado?.hayCambiosSinPublicar && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              El flujo se modificó desde la última versión publicada. Publicá una nueva versión para que la
              Ficha de Proceso refleje los cambios.
            </p>
          )}

          <p className="mb-2 text-xs text-muted-foreground">
            Al publicar, se congela el flujo actual y se genera (o actualiza) una <strong>Ficha de Proceso</strong> en
            el maestro documental. Ese documento sigue el ciclo de aprobación normal: pasa a revisión, se aprueba
            y queda vigente, con sus acuses de lectura.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground">Motivo del cambio</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="ej. Se agregó el control de calidad en recepción"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <button
              disabled={pending}
              onClick={publicar}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Publicando…" : estado?.tieneVersiones ? "Publicar nueva versión" : "Publicar versión 1.0"}
            </button>
          </div>

          {msg && (
            <p className={`mt-2 rounded-md px-3 py-2 text-xs ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {msg.texto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
