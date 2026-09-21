"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePenLine, Save, Plus, Loader2 } from "lucide-react";
import type { Accion } from "@/lib/api/acciones";
import { listarDocumentosCambio, listarVersionesCambio, guardarCambioDocumental, crearBorradorCambio } from "@/app/(app)/ncs/[id]/documental-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError } from "@/components/ui/modal";

type Documento = { id: string; codigo: string; titulo: string };
type Version = { id: string; numero_version: string; estado: string; es_vigente: boolean };
export type EstadoDocumental = { accion_id: string; bloqueo_completar: string | null; bloqueo_eficacia: string | null; lecturas_total: number; lecturas_pendientes: number };
const INPUT = "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm";

export function CambioDocumental({ accion, ncId, editable, historico, estado }: { accion: Accion; ncId: string; editable: boolean; historico: boolean; estado?: EstadoDocumental }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [documento, setDocumento] = useState(accion.versionResultante?.documento_id ?? "");
  const [version, setVersion] = useState(accion.versionResultanteId ?? "");
  const [requiere, setRequiere] = useState(accion.requiereCambioDocumental);

  function abrir() {
    setError(null);
    setAbierto(true);
    setRequiere(accion.requiereCambioDocumental);
    setDocumento(accion.versionResultante?.documento_id ?? "");
    setVersion(accion.versionResultanteId ?? "");
    startTransition(async () => {
      try {
        setDocumentos(await listarDocumentosCambio());
        setVersiones(accion.versionResultante ? await listarVersionesCambio(accion.versionResultante.documento_id) : []);
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los documentos."); }
    });
  }

  function seleccionarDocumento(id: string) {
    setDocumento(id); setVersion(""); setVersiones([]); setError(null);
    if (!id) return;
    startTransition(async () => {
      try { setVersiones(await listarVersionesCambio(id)); }
      catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las versiones."); }
    });
  }

  function guardar(borrador: boolean) {
    setError(null);
    if (!borrador && requiere && documento && !version) {
      setError("Elegí una versión resultante o creá el borrador.");
      return;
    }
    startTransition(async () => {
      try {
        const result = borrador
          ? await crearBorradorCambio(ncId, accion.id, documento)
          : await guardarCambioDocumental({ ncId, accionId: accion.id, requiere, versionId: version || null });
        if (!result.ok) { setError(result.error); return; }
        setAbierto(false);
        if (borrador) router.push(`/documentos/${documento}`);
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el cambio documental."); }
    });
  }

  return <div className="mt-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-medium">{accion.requiereCambioDocumental ? "Cambio documental requerido" : "Sin cambio documental requerido"}</span>
      {editable && <Button size="sm" variant="ghost" onClick={abrir}><FilePenLine className="h-4 w-4" />Cambio documental</Button>}
    </div>
    {accion.versionResultante && <Link className="mt-1 block break-words text-sm text-primary underline" href={`/documentos/${accion.versionResultante.documento_id}`}>
      {accion.versionResultante.documento?.codigo ?? "Documento"} · Versión {accion.versionResultante.numero_version} · {accion.versionResultante.estado}
    </Link>}
    {historico && accion.requiereCambioDocumental && <p className="mt-2 text-xs text-muted-foreground">Referencia documental histórica</p>}
    {estado && !historico && <div className="mt-2 space-y-1 text-xs">
      {estado.lecturas_total > 0 && <p>Lecturas: {estado.lecturas_total - estado.lecturas_pendientes} de {estado.lecturas_total}</p>}
      <p className={estado.bloqueo_eficacia ? "text-amber-700" : "text-emerald-700"}>{estado.bloqueo_eficacia ?? "Documentación disponible para verificar eficacia."}</p>
    </div>}
    <ModalShell abierto={abierto} onClose={() => !pending && setAbierto(false)} maxWidth="max-w-xl">
      <ModalHeader><h2 className="text-xl font-semibold">Cambio documental</h2><p className="mt-1 text-sm">{accion.codigo} · {accion.titulo}</p></ModalHeader>
      <ModalBody className="space-y-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requiere} disabled={pending} onChange={(e) => setRequiere(e.target.checked)} />Requiere cambio documental</label>
        {requiere && <>
          <div><label htmlFor={`doc-${accion.id}`} className="mb-1 block text-sm">Documento</label><select id={`doc-${accion.id}`} value={documento} disabled={pending} onChange={(e) => seleccionarDocumento(e.target.value)} className={INPUT}><option value="">Seleccionar documento</option>{documentos.map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.titulo}</option>)}</select></div>
          <div><label htmlFor={`ver-${accion.id}`} className="mb-1 block text-sm">Versión resultante</label><select id={`ver-${accion.id}`} value={version} disabled={pending || !documento} onChange={(e) => setVersion(e.target.value)} className={INPUT}><option value="">Pendiente de vincular</option>{versiones.map((v) => <option key={v.id} value={v.id}>{v.numero_version} · {v.estado}{v.es_vigente ? " · vigente" : ""}</option>)}</select></div>
          {!accion.versionResultanteId && !["completada", "cancelada"].includes(accion.estado) && <Button variant="outline" disabled={pending || !documento} onClick={() => guardar(true)}><Plus className="h-4 w-4" />Crear borrador desde esta acción</Button>}
        </>}
      </ModalBody>
      <ModalFooter><ModalError mensaje={error} /><div className="flex justify-end gap-3"><Button variant="outline" disabled={pending} onClick={() => setAbierto(false)}>Cancelar</Button><Button disabled={pending} onClick={() => guardar(false)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar</Button></div></ModalFooter>
    </ModalShell>
  </div>;
}
