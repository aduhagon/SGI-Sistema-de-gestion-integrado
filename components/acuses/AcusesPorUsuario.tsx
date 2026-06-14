"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Mail,
} from "lucide-react";
import type { UsuarioConPendientes } from "@/lib/api/acusesPendientes";

/**
 * Vista de acuses pendientes agrupados por usuario. Cada usuario es una tarjeta
 * colapsable con la lista de documentos que le falta firmar. Pensada para que el
 * administrador gestione y reclame.
 */
export function AcusesPorUsuario({
  usuarios,
}: {
  usuarios: UsuarioConPendientes[];
}) {
  if (usuarios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="font-medium">No hay acuses pendientes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los usuarios firmaron los documentos que les corresponden. Cuando
          se generen nuevos acuses (al aprobar documentos que requieren lectura),
          los pendientes aparecerán acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {usuarios.map((u) => (
        <UsuarioCard key={u.usuarioId} usuario={u} />
      ))}
    </div>
  );
}

function UsuarioCard({ usuario }: { usuario: UsuarioConPendientes }) {
  const [abierto, setAbierto] = useState(true);
  const tieneVencidos = usuario.vencidos > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {abierto ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{usuario.nombreCompleto}</div>
          {usuario.email && (
            <div className="text-xs text-muted-foreground truncate">{usuario.email}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tieneVencidos && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {usuario.vencidos} vencido{usuario.vencidos !== 1 ? "s" : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {usuario.totalPendientes} pendiente{usuario.totalPendientes !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {abierto && (
        <div className="border-t border-border">
          {usuario.email && (
            <div className="flex justify-end px-4 pt-3">
              <a
                href={construirMailto(usuario)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Enviar recordatorio por email
              </a>
            </div>
          )}
          <ul className="divide-y divide-border px-2 py-2">
            {usuario.acuses.map((a) => (
              <li key={a.acuse_id}>
                <Link
                  href={`/documentos/${a.documento_id}`}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
                    {a.codigo}
                  </span>
                  <span className="text-sm flex-1 truncate group-hover:text-foreground">
                    {a.titulo}
                    <span className="text-muted-foreground"> · v{a.numero_version}</span>
                  </span>
                  {a.plazo_objetivo && (
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0 " +
                        (a.vencido
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-500/10 text-amber-700")
                      }
                    >
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {a.vencido ? "Venció" : "Vence"} {formatearFecha(a.plazo_objetivo)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function construirMailto(usuario: UsuarioConPendientes): string {
  const asunto = encodeURIComponent("Recordatorio: acuses de lectura pendientes");
  const lista = usuario.acuses
    .map((a) => `- ${a.codigo} ${a.titulo} (v${a.numero_version})`)
    .join("\n");
  const cuerpo = encodeURIComponent(
    `Hola ${usuario.nombreCompleto},\n\n` +
      `Te recordamos que tenés ${usuario.totalPendientes} documento(s) pendiente(s) de acuse de lectura en el SGI:\n\n` +
      `${lista}\n\n` +
      `Por favor, ingresá al sistema para registrar la lectura.\n\nGracias.`,
  );
  return `mailto:${usuario.email}?subject=${asunto}&body=${cuerpo}`;
}
