"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  ShieldCheck,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError } from "@/components/ui/modal";
import {
  asignarRolGlobal,
  revocarRolGlobal,
  type EstadoRolGlobal,
} from "@/app/(app)/configuracion/usuarios/actions";
import type {
  UsuarioConRoles,
  RolGlobalCatalogo,
} from "@/lib/api/rolesGlobales";

export default function GestionRolesGlobales({
  usuarios,
  roles,
}: {
  usuarios: UsuarioConRoles[];
  roles: RolGlobalCatalogo[];
}) {
  const router = useRouter();

  // Diálogo de asignación.
  const [abierto, setAbierto] = useState(false);
  const [usuarioSel, setUsuarioSel] = useState("");
  const [rolSel, setRolSel] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<EstadoRolGlobal>(null);

  // Diálogo de revocación.
  const [revocar, setRevocar] = useState<{
    usuarioId: string;
    usuarioNombre: string;
    rolCodigo: string;
    rolNombre: string;
  } | null>(null);
  const [motivoRev, setMotivoRev] = useState("");
  const [revocando, setRevocando] = useState(false);
  const [estadoRev, setEstadoRev] = useState<EstadoRolGlobal>(null);

  async function confirmarAsignar() {
    setGuardando(true);
    setEstado(null);
    const fd = new FormData();
    fd.set("usuarioId", usuarioSel);
    fd.set("rolCodigo", rolSel);
    fd.set("motivo", motivo);
    const r = await asignarRolGlobal(null, fd);
    setGuardando(false);
    setEstado(r);
    if (r?.ok) {
      cerrarAsignar();
      router.refresh();
    }
  }

  function cerrarAsignar() {
    setAbierto(false);
    setUsuarioSel("");
    setRolSel("");
    setMotivo("");
    setEstado(null);
  }

  async function confirmarRevocar() {
    if (!revocar) return;
    setRevocando(true);
    setEstadoRev(null);
    const r = await revocarRolGlobal(
      revocar.usuarioId,
      revocar.rolCodigo,
      motivoRev,
    );
    setRevocando(false);
    setEstadoRev(r);
    if (r?.ok) {
      setRevocar(null);
      setMotivoRev("");
      setEstadoRev(null);
      router.refresh();
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            Roles globales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Los roles globales definen el acceso transversal al sistema. Cada
            asignación queda registrada en la auditoría con su motivo.
          </p>
        </div>
        <Button size="sm" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />
          Asignar rol
        </Button>
      </div>

      {usuarios.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Usuario</th>
                <th className="px-4 py-2.5 font-medium">Roles globales vigentes</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.usuarioId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{u.personaNombre}</div>
                        <div className="text-xs text-muted-foreground">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((r) => (
                          <span
                            key={r.codigo}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
                          >
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            {r.nombre}
                            <button
                              type="button"
                              onClick={() =>
                                setRevocar({
                                  usuarioId: u.usuarioId,
                                  usuarioNombre: u.personaNombre,
                                  rolCodigo: r.codigo,
                                  rolNombre: r.nombre,
                                })
                              }
                              className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title={`Revocar ${r.nombre}`}
                              aria-label={`Revocar ${r.nombre}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin roles globales
                      </span>
                    )}
                  </td>
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

      {/* Diálogo: asignar rol */}
      <ModalShell abierto={abierto} onClose={cerrarAsignar} maxWidth="max-w-lg">
        <ModalHeader>
          <h3 className="font-serif text-2xl font-semibold tracking-tight">
            Asignar rol global
          </h3>
        </ModalHeader>
        <ModalBody>
              <div className="space-y-4 pb-3">
                <div className="space-y-2">
                  <label htmlFor="usuarioSel" className="text-sm font-medium">
                    Usuario
                  </label>
                  <select
                    id="usuarioSel"
                    value={usuarioSel}
                    onChange={(e) => setUsuarioSel(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Elegí un usuario…</option>
                    {usuarios.map((u) => (
                      <option key={u.usuarioId} value={u.usuarioId}>
                        {u.personaNombre} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="rolSel" className="text-sm font-medium">
                    Rol global
                  </label>
                  <select
                    id="rolSel"
                    value={rolSel}
                    onChange={(e) => setRolSel(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Elegí un rol…</option>
                    {roles.map((r) => (
                      <option key={r.codigo} value={r.codigo}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  {rolSel && (
                    <p className="text-xs text-muted-foreground">
                      {roles.find((r) => r.codigo === rolSel)?.descripcion ?? ""}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="motivo" className="text-sm font-medium">
                    Motivo de la asignación
                  </label>
                  <textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    placeholder="Por qué se asigna este rol (queda en la auditoría)."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

              </div>
        </ModalBody>
        <ModalFooter>
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cerrarAsignar}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAsignar}
              disabled={guardando || !usuarioSel || !rolSel || motivo.trim().length < 5}
            >
              {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Asignar rol
            </Button>
          </div>
        </ModalFooter>
      </ModalShell>

      {/* Diálogo: revocar rol */}
      {revocar && (
        <ModalShell
          abierto
          onClose={() => {
            setRevocar(null);
            setMotivoRev("");
            setEstadoRev(null);
          }}
          maxWidth="max-w-md"
        >
          <ModalHeader>
            <h3 className="font-serif text-xl font-semibold tracking-tight">
              Revocar rol global
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vas a revocar el rol{" "}
              <span className="font-medium text-foreground">
                {revocar.rolNombre}
              </span>{" "}
              de{" "}
              <span className="font-medium text-foreground">
                {revocar.usuarioNombre}
              </span>
              . La asignación no se borra: se cierra su vigencia y queda en el
              historial.
            </p>
          </ModalHeader>
          <ModalBody>
              <div className="space-y-2 pb-1">
                <label htmlFor="motivoRev" className="text-sm font-medium">
                  Motivo de la revocación
                </label>
                <textarea
                  id="motivoRev"
                  value={motivoRev}
                  onChange={(e) => setMotivoRev(e.target.value)}
                  rows={3}
                  placeholder="Por qué se revoca (queda en la auditoría)."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estadoRev && !estadoRev.ok ? estadoRev.error : null} />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRevocar(null);
                  setMotivoRev("");
                  setEstadoRev(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmarRevocar}
                disabled={revocando || motivoRev.trim().length < 5}
              >
                {revocando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Revocar
              </Button>
            </div>
          </ModalFooter>
        </ModalShell>
      )}
    </section>
  );
}
