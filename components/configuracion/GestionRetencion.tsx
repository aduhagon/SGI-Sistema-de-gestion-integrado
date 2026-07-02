"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Save, Archive, Info } from "lucide-react";
import type { PoliticaRetencion } from "@/lib/api/configuracion";
import { crearPoliticaRetencion, type EstadoConfig } from "@/app/(app)/configuracion/retencion/actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Opcion = { id: string; nombre: string };

const PURGA_ETIQUETA: Record<string, string> = {
  nunca: "Nunca purgar",
  marcar_para_purga: "Marcar para revisión",
  purga_automatica: "Purga automática",
};

const CRITICIDADES = ["critico", "alto", "medio", "bajo"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />Crear política</>}
    </Button>
  );
}

export function GestionRetencion({ politicas, tipos, normas, procesos }: {
  politicas: PoliticaRetencion[];
  tipos: Opcion[];
  normas: Opcion[];
  procesos: Opcion[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [purga, setPurga] = useState("nunca");
  const [estado, formAction] = useFormState<EstadoConfig, FormData>(crearPoliticaRetencion, null);

  useEffect(() => {
    if (estado?.ok) { setAbierto(false); router.refresh(); }
  }, [estado, router]);

  function ambito(p: PoliticaRetencion): string {
    const partes: string[] = [];
    if (p.tipoDocumentalNombre) partes.push(`Tipo: ${p.tipoDocumentalNombre}`);
    if (p.normaNombre) partes.push(`Norma: ${p.normaNombre}`);
    if (p.procesoNombre) partes.push(`Proceso: ${p.procesoNombre}`);
    if (p.criticidadAplicable) partes.push(`Criticidad: ${cap(p.criticidadAplicable)}`);
    return partes.length > 0 ? partes.join(" · ") : "General (todo el SGI)";
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setPurga("nunca"); setAbierto(true); }}><Plus className="h-4 w-4" />Nueva política</Button>
      </div>

      {politicas.length > 0 ? (
        <div className="space-y-3">
          {politicas.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                    <span className="font-medium">{p.nombre}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ambito(p)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{PURGA_ETIQUETA[p.politicaPurga] ?? p.politicaPurga}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                <span>Versiones obsoletas: <strong className="text-foreground">{p.aniosVersionesObsoletas} a.</strong></span>
                <span>Eventos auditoría: <strong className="text-foreground">{p.aniosEventosAuditoria} a.</strong></span>
                <span>Firmas: <strong className="text-foreground">{p.aniosFirmas} a.</strong></span>
                <span>Acuses: <strong className="text-foreground">{p.aniosAcuses} a.</strong></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Archive className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No hay políticas de retención</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">Definen cuánto se conserva cada tipo de información antes de poder purgarla. Son parte del pilar de retención de la auditabilidad ISO. Conviene definirlas con el Comité del SGI.</p>
        </div>
      )}

      {abierto && (
        <ModalShell abierto onClose={() => setAbierto(false)} maxWidth="max-w-xl">
          <ModalHeader>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Nueva política de retención</h2>
          </ModalHeader>
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-5 pb-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                    <input id="codigo" name="codigo" required placeholder="RET-001" className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                    <input id="nombre" name="nombre" required placeholder="Ej: Retención general de registros" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="descripcion" name="descripcion" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ámbito de aplicación <span className="normal-case font-normal">(dejá vacío para política general)</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    <select name="tipoDocumentalId" defaultValue="" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Cualquier tipo documental</option>
                      {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <select name="normaId" defaultValue="" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Cualquier norma</option>
                      {normas.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                    <select name="procesoId" defaultValue="" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Cualquier proceso</option>
                      {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <select name="criticidadAplicable" defaultValue="" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Cualquier criticidad</option>
                      {CRITICIDADES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plazos de retención (en años)</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <label htmlFor="aniosVersionesObsoletas" className="text-xs text-muted-foreground">Versiones obsoletas</label>
                      <input id="aniosVersionesObsoletas" name="aniosVersionesObsoletas" type="number" min={1} required defaultValue={10} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aniosEventosAuditoria" className="text-xs text-muted-foreground">Eventos auditoría</label>
                      <input id="aniosEventosAuditoria" name="aniosEventosAuditoria" type="number" min={1} required defaultValue={10} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aniosFirmas" className="text-xs text-muted-foreground">Firmas</label>
                      <input id="aniosFirmas" name="aniosFirmas" type="number" min={1} required defaultValue={999} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aniosAcuses" className="text-xs text-muted-foreground">Acuses</label>
                      <input id="aniosAcuses" name="aniosAcuses" type="number" min={1} required defaultValue={10} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="aniosDocumentosInactivos" className="text-xs text-muted-foreground">Documentos inactivos <span className="text-muted-foreground">(opcional)</span></label>
                    <input id="aniosDocumentosInactivos" name="aniosDocumentosInactivos" type="number" min={1} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="politicaPurga" className="text-sm font-medium">Política de purga</label>
                  <select id="politicaPurga" name="politicaPurga" value={purga} onChange={(e) => setPurga(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="nunca">Nunca purgar (conservar indefinidamente)</option>
                    <option value="marcar_para_purga">Marcar para revisión manual</option>
                    <option value="purga_automatica">Purga automática al vencer</option>
                  </select>
                </div>

                {purga === "purga_automatica" && (
                  <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-1.5 text-xs text-amber-800">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>La purga automática borra información al vencer el plazo. Requiere un fundamento de aprobación formal, y queda registrada a tu nombre como aprobador.</span>
                    </div>
                    <textarea name="fundamentoAprobacion" rows={2} placeholder="Fundamento de la aprobación (acta del Comité, decisión, etc.)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                )}

            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
              <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton />
              </div>
            </ModalFooter>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
