"use client";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, Save, Loader2 } from "lucide-react";
import type { NCDetalle } from "@/lib/api/ncs";
import { guardarPlanTratamiento, type EstadoPlan } from "@/app/(app)/ncs/[id]/plan-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

const INPUT = "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm";
type Persona = { id: string; nombre: string };
function Guardar() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar plan</Button>; }

export function PlanTratamiento({ nc, usuarios, verificadores, puedeGestionar }: { nc: NCDetalle; usuarios: Persona[]; verificadores: Persona[]; puedeGestionar: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useFormState<EstadoPlan, FormData>(guardarPlanTratamiento, null);
  const router = useRouter();
  useEffect(() => { if (estado?.ok) { setAbierto(false); router.refresh(); } }, [estado, router]);
  const nombre = (id: string | null) => usuarios.find((u) => u.id === id)?.nombre ?? "Sin asignar";
  return <section id="tratamiento" className="mb-8 scroll-mt-24 border-y border-border py-5">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Plan de tratamiento</h2>{puedeGestionar && <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Pencil className="h-4 w-4" />Editar plan</Button>}</div>
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Responsable</dt><dd>{nombre(nc.responsableId)}</dd></div>
      <div><dt className="text-muted-foreground">Cierre previsto</dt><dd>{nc.fechaLimiteCierre ?? "Sin programar"}</dd></div>
      <div><dt className="text-muted-foreground">Verificador de eficacia</dt><dd>{nombre(nc.verificadorId)}</dd></div>
      <div><dt className="text-muted-foreground">Verificación prevista</dt><dd>{nc.fechaVerificacionPrevista ?? "Sin programar"}</dd></div>
    </dl>
    <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-xl">
      <ModalHeader><h2 className="text-xl font-semibold">Plan de tratamiento</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{nc.codigo}</p></ModalHeader>
      <form action={formAction} className={MODAL_FORM_CLASS}><ModalBody className="space-y-4">
        <input name="ncId" type="hidden" value={nc.id} />
        <div><label htmlFor="plan-responsable" className="mb-1 block text-sm">Responsable de tratamiento</label><select id="plan-responsable" name="responsableId" required defaultValue={nc.responsableId ?? ""} className={INPUT}><option value="">Elegí un responsable</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
        <div><label htmlFor="plan-verificador" className="mb-1 block text-sm">Verificador SGI</label><select id="plan-verificador" name="verificadorId" required defaultValue={nc.verificadorId ?? ""} className={INPUT}><option value="">Elegí un verificador</option>{verificadores.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="plan-cierre" className="mb-1 block text-sm">Cierre previsto</label><input id="plan-cierre" name="fechaCierre" type="date" required defaultValue={nc.fechaLimiteCierre ?? ""} className={INPUT} /></div><div><label htmlFor="plan-verificacion" className="mb-1 block text-sm">Verificación prevista</label><input id="plan-verificacion" name="fechaVerificacion" type="date" required defaultValue={nc.fechaVerificacionPrevista ?? ""} className={INPUT} /></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiereInmediata" defaultChecked={nc.requiereAccionInmediata} />Requiere corrección inmediata</label>
        <div><label htmlFor="plan-correccion" className="mb-1 block text-sm">Corrección inmediata</label><textarea id="plan-correccion" name="correccion" rows={3} maxLength={2000} defaultValue={nc.accionInmediataDescripcion ?? ""} className={INPUT} /></div>
      </ModalBody><ModalFooter><ModalError mensaje={estado && !estado.ok ? estado.error : null} /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button><Guardar /></div></ModalFooter></form>
    </ModalShell>
  </section>;
}
