"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2, Save, UserCircle, UserX, UserCheck, Building } from "lucide-react";
import type { PersonaResumen } from "@/lib/api/personas";
import { guardarPersona, darDeBajaPersona, reactivarPersona, type EstadoPersonaABM } from "@/app/(app)/configuracion/personas/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type AreaOpcion = { id: string; codigo: string; nombre: string };

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />{edicion ? "Guardar" : "Crear persona"}</>}
    </Button>
  );
}

export function GestionPersonas({ personas, areas, incluyeInactivas }: {
  personas: PersonaResumen[];
  areas: AreaOpcion[];
  incluyeInactivas: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<PersonaResumen | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [esExterna, setEsExterna] = useState(false);
  const [bajaDe, setBajaDe] = useState<PersonaResumen | null>(null);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [estado, formAction] = useFormState<EstadoPersonaABM, FormData>(guardarPersona, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setEditando(null); router.refresh(); }
  }, [estado, router]);

  function abrirNueva() { setEditando(null); setEsExterna(false); setAbierto(true); }
  function abrirEdicion(p: PersonaResumen) { setEditando(p); setEsExterna(p.esExterna); setAbierto(true); }

  async function confirmarBaja() {
    if (!bajaDe) return;
    setProcesando(bajaDe.id);
    const r = await darDeBajaPersona(bajaDe.id, motivoBaja);
    setProcesando(null);
    setBajaDe(null); setMotivoBaja("");
    if (r?.ok) router.refresh();
  }

  async function reactivar(id: string) {
    setProcesando(id);
    const r = await reactivarPersona(id);
    setProcesando(null);
    if (r?.ok) router.refresh();
  }

  function toggleInactivas() {
    router.push(incluyeInactivas ? "/configuracion/personas" : "/configuracion/personas?ver=todas");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={toggleInactivas} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {incluyeInactivas ? "← Ver solo activas" : "Ver también las dadas de baja"}
        </button>
        <Button size="sm" onClick={abrirNueva}><Plus className="h-4 w-4" />Nueva persona</Button>
      </div>

      {personas.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Persona</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Área</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => (
                <tr key={p.id} className={`border-b border-border last:border-0 ${!p.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/configuracion/personas/${p.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span>
                        {p.nombreCompleto}
                        {!p.activo && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Baja</span>}
                        {p.esExterna && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700">Externa</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {p.areaNombre ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{p.email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEdicion(p)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {p.activo ? (
                        <button onClick={() => setBajaDe(p)} disabled={procesando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Dar de baja" aria-label="Dar de baja">
                          {procesando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <button onClick={() => reactivar(p.id)} disabled={procesando === p.id} className="rounded p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50" title="Reactivar" aria-label="Reactivar">
                          {procesando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <UserCircle className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay personas cargadas</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Las personas son el padrón del sistema. Pueden tener cuenta de usuario o no (auditores externos, por ejemplo).</p>
        </div>
      )}

      {/* Diálogo alta/edición */}
      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-lg">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{editando ? "Editar persona" : "Nueva persona"}</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                    <input id="nombre" name="nombre" required defaultValue={editando?.nombre ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="apellido" className="text-sm font-medium">Apellido</label>
                    <input id="apellido" name="apellido" required defaultValue={editando?.apellido ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email <span className="text-muted-foreground">(opcional)</span></label>
                    <input id="email" name="email" type="email" defaultValue={editando?.email ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="documentoIdentidad" className="text-sm font-medium">Documento <span className="text-muted-foreground">(opcional)</span></label>
                    <input id="documentoIdentidad" name="documentoIdentidad" defaultValue={editando?.documentoIdentidad ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="areaId" className="text-sm font-medium">Área <span className="text-muted-foreground">(opcional)</span></label>
                  <select id="areaId" name="areaId" defaultValue={editando?.areaId ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sin área</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">El cargo de la persona surge del puesto que ocupa (se asigna desde Puestos), no se escribe acá.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" name="esExterna" checked={esExterna} onChange={(e) => setEsExterna(e.target.checked)} className="h-4 w-4" />
                  Es una persona externa (auditor externo, proveedor, etc.)
                </label>
                {esExterna && (
                  <div className="space-y-2">
                    <label htmlFor="organizacionExterna" className="text-sm font-medium">Organización externa</label>
                    <input id="organizacionExterna" name="organizacionExterna" defaultValue={editando ? "" : ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                )}
            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
              <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton edicion={!!editando} />
              </div>
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {/* Diálogo baja */}
      {bajaDe && (
        <ModalShell abierto onClose={() => setBajaDe(null)} maxWidth="max-w-md">
          <ModalHeader>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Dar de baja</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vas a dar de baja a <span className="font-medium text-foreground">{bajaDe.nombreCompleto}</span>. Queda
              registrada como histórica (no se borra), con la fecha de hoy. Sus puestos vigentes deberían cerrarse aparte.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2 pb-1">
              <label htmlFor="motivo" className="text-sm font-medium">Motivo de la baja</label>
              <input id="motivo" value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} placeholder="Ej: Fin de relación laboral" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setBajaDe(null)} className="flex-1">Cancelar</Button>
              <Button type="button" variant="destructive" onClick={confirmarBaja} disabled={procesando === bajaDe.id} className="flex-1">
                {procesando === bajaDe.id ? <><Loader2 className="h-4 w-4 animate-spin" />Procesando…</> : <><UserX className="h-4 w-4" />Dar de baja</>}
              </Button>
            </div>
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
