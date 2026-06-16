import Link from "next/link";
import { User, AlertTriangle, ChevronRight } from "lucide-react";
import type { UsuarioConAprobaciones } from "@/lib/api/aprobacionesAgregados";

function FichaUsuario({ u }: { u: UsuarioConAprobaciones }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">{u.nombre}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{u.total} pendiente{u.total !== 1 ? "s" : ""}</span>
            {u.vencidas > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {u.vencidas} vencida{u.vencidas !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-border px-4 py-3">
        <ul className="space-y-2">
          {u.aprobaciones.map((a) => (
            <li key={a.aprobacionId}>
              <Link
                href={`/documentos/${a.documentoId}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">{a.codigo}</span>
                  <span className="ml-2">{a.titulo}</span>
                  <span className="ml-2 text-xs text-muted-foreground">v{a.numeroVersion}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    N{a.nivelPendiente}
                  </span>
                  {a.vencida ? (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                      Vencida
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {a.diasEsperando} día{a.diasEsperando !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function AprobacionesPorUsuario({
  usuarios,
}: {
  usuarios: UsuarioConAprobaciones[];
}) {
  if (usuarios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay aprobaciones pendientes asignadas a ningún usuario.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {usuarios.map((u) => (
        <FichaUsuario key={u.usuarioId ?? u.nombre} u={u} />
      ))}
    </div>
  );
}
