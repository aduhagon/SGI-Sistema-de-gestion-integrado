"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, AlertCircle, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  asignarRolGlobal,
  revocarRolGlobal,
  type EstadoRolGlobal,
} from "@/app/(app)/configuracion/usuarios/actions";
import type {
  UsuarioConRoles,
  RolGlobalCatalogo,
} from "@/lib/api/rolesGlobales";

type Pendiente = {
  modo: "asignar" | "revocar";
  usuarioId: string;
  usuarioNombre: string;
  rolCodigo: string;
  rolNombre: string;
};

export default function MatrizRolesGlobales({
  usuarios,
  roles,
}: {
  usuarios: UsuarioConRoles[];
  roles: RolGlobalCatalogo[];
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState<EstadoRolGlobal>(null);

  function tiene(u: UsuarioConRoles, rolCodigo: string) {
    return u.roles.some((r) => r.codigo === rolCodigo);
  }

  function abrir(u: UsuarioConRoles, rol: RolGlobalCatalogo) {
    const yaTiene = tiene(u, rol.codigo);
    setPendiente({
      modo: yaTiene ? "revocar" : "asignar",
      usuarioId: u.usuarioId,
      usuarioNombre: u.personaNombre,
      rolCodigo: rol.codigo,
      rolNombre: rol.nombre,
    });
    setMotivo("");
    setEstado(null);
  }

  function cerrar() {
    setPendiente(null);
    setMotivo("");
    setEstado(null);
  }

  async function confirmar() {
    if (!pendiente) return;
    setProcesando(true);
    setEstado(null);

    let r: EstadoRolGlobal;
    if (pendiente.modo === "asignar") {
      const fd = new FormData();
      fd.set("usuarioId", pendiente.usuarioId);
      fd.set("rolCodigo", pendiente.rolCodigo);
      fd.set("motivo", motivo);
      r = await asignarRolGlobal(null, fd);
    } else {
      r = await revocarRolGlobal(
        pendiente.usuarioId,
        pendiente.rolCodigo,
        motivo,
      );
    }

    setProcesando(false);
    setEstado(r);
    if (r?.ok) {
      cerrar();
      router.refresh();
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Matriz de roles globales
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tildá una celda para asignar el rol; destildá para revocarlo. Cada cambio
          pide un motivo y queda registrado en la auditoría.
        </p>
      </div>

      {usuarios.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Usuario
                </th>
                {roles.map((rol) => (
                  <th
                    key={rol.codigo}
                    className="px-3 py-3 text-center text-xs font-medium text-muted-foreground"
                    title={rol.descripcion ?? rol.nombre}
                  >
                    <div className="mx-auto max-w-[7rem] leading-tight">
                      {rol.nombre}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.usuarioId} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-6 w-6 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.personaNombre}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  {roles.map((rol) => {
                    const activo = tiene(u, rol.codigo);
                    return (
                      <td key={rol.codigo} className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => abrir(u, rol)}
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                            activo
                              ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-border bg-background hover:border-muted-foreground/50 hover:bg-muted"
                          }`}
                          title={
                            activo
                              ? `Revocar ${rol.nombre} a ${u.personaNombre}`
                              : `Asignar ${rol.nombre} a ${u.personaNombre}`
                          }
                          aria-label={
                            activo
                              ? `Revocar ${rol.nombre}`
                              : `Asignar ${rol.nombre}`
                          }
                          aria-pressed={activo}
                        >
                          {activo && <Check className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <UserCircle className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay usuarios con cuenta activa</p>
        </div>
      )}

      {/* Diálogo de confirmación con motivo */}
      {pendiente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={cerrar}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h3 className="font-serif text-xl font-semibold tracking-tight">
                {pendiente.modo === "asignar"
                  ? "Asignar rol global"
                  : "Revocar rol global"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {pendiente.modo === "asignar" ? "Asignar " : "Revocar "}
                <span className="font-medium text-foreground">
                  {pendiente.rolNombre}
                </span>{" "}
                {pendiente.modo === "asignar" ? "a " : "de "}
                <span className="font-medium text-foreground">
                  {pendiente.usuarioNombre}
                </span>
                .{" "}
                {pendiente.modo === "revocar" &&
                  "La asignación no se borra: se cierra su vigencia y queda en el historial."}
              </p>
              <div className="mt-4 space-y-2">
                <label htmlFor="motivo" className="text-sm font-medium">
                  Motivo
                </label>
                <textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Por qué se hace este cambio (queda en la auditoría)."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              {estado && !estado.ok && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {estado.error}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={cerrar}>
                  Cancelar
                </Button>
                <Button
                  variant={
                    pendiente.modo === "revocar" ? "destructive" : "default"
                  }
                  onClick={confirmar}
                  disabled={procesando || motivo.trim().length < 5}
                >
                  {procesando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pendiente.modo === "asignar" ? "Asignar" : "Revocar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
