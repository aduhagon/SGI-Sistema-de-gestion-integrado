"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CirclePlay,
  FileCheck2,
  History,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { Control, OpcionesControl, ResultadoControl } from "@/lib/api/controles";
import { desactivarControl } from "@/app/(app)/controles/actions";
import { ControlFormModal } from "@/components/controles/ControlFormModal";
import { EjecucionControlModal } from "@/components/controles/EjecucionControlModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RESULTADO_LABEL: Record<ResultadoControl, string> = {
  efectivo: "Efectivo",
  parcial: "Parcial",
  inefectivo: "Inefectivo",
  no_aplica: "No aplica",
};

const RESULTADO_COLOR: Record<ResultadoControl, string> = {
  efectivo: "bg-emerald-100 text-emerald-700",
  parcial: "bg-amber-100 text-amber-700",
  inefectivo: "bg-red-100 text-red-700",
  no_aplica: "bg-muted text-muted-foreground",
};

const PERIODICIDAD_LABEL: Record<string, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  ad_hoc: "Ad hoc",
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Sin programar";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${fecha}T12:00:00Z`),
  );
}

function estadoVencimiento(control: Control): { texto: string; clase: string } {
  if (control.estado === "suspendido") return { texto: "Suspendido", clase: "bg-muted text-muted-foreground" };
  if (!control.proximaEjecucion) return { texto: "Sin vencimiento", clase: "bg-muted text-muted-foreground" };
  const hoy = new Date();
  const hoyClave = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [anio, mes, dia] = control.proximaEjecucion.split("-").map(Number);
  const diferencia = Math.round((Date.UTC(anio, mes - 1, dia) - hoyClave) / 86_400_000);
  if (diferencia < 0) return { texto: `Vencido hace ${Math.abs(diferencia)} d`, clase: "bg-red-100 text-red-700" };
  if (diferencia === 0) return { texto: "Vence hoy", clase: "bg-red-100 text-red-700" };
  if (diferencia <= control.anticipacionDias) return { texto: `Vence en ${diferencia} d`, clase: "bg-amber-100 text-amber-700" };
  return { texto: formatearFecha(control.proximaEjecucion), clase: "bg-muted text-muted-foreground" };
}

export function GestionControles({
  controles,
  opciones,
}: {
  controles: Control[];
  opciones: OpcionesControl;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState("");
  const [procesoFiltro, setProcesoFiltro] = useState(searchParams.get("proceso") ?? "");
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Control | null>(null);
  const [ejecutando, setEjecutando] = useState<Control | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlId = searchParams.get("control");
    if (!controlId) return;
    const control = controles.find((item) => item.id === controlId);
    if (control) {
      setEjecutando(control);
      router.replace("/controles", { scroll: false });
    }
  }, [controles, router, searchParams]);

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    return controles.filter((control) => {
      if (procesoFiltro && control.procesoId !== procesoFiltro) return false;
      if (!consulta) return true;
      return `${control.codigo} ${control.nombre} ${control.procesoCodigo} ${control.procesoNombre}`
        .toLowerCase()
        .includes(consulta);
    });
  }, [busqueda, controles, procesoFiltro]);

  function abrir(control: Control | null) {
    setEditando(control);
    setFormAbierto(true);
    setError(null);
  }

  async function retirar(control: Control) {
    if (!window.confirm(`Retirar el control ${control.codigo}? El historial de ejecuciones se conserva.`)) return;
    setEliminando(control.id);
    setError(null);
    const resultado = await desactivarControl(control.id);
    setEliminando(null);
    if (resultado?.ok) router.refresh();
    else if (resultado && !resultado.ok) setError(resultado.error);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm sm:w-80">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Buscar controles</span>
            <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por código, control o proceso…" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <select value={procesoFiltro} onChange={(evento) => setProcesoFiltro(evento.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Todos los procesos</option>
            {opciones.procesos.map((proceso) => <option key={proceso.id} value={proceso.id}>{proceso.codigo} - {proceso.nombre}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Nuevo control</Button>
      </div>

      {error && <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      {filtrados.length > 0 ? (
        <>
        <div className="space-y-3 md:hidden">
          {filtrados.map((control) => {
            const vencimiento = estadoVencimiento(control);
            return <article key={control.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{control.codigo}</p><h3 className="mt-1 break-words font-sans text-base font-semibold">{control.nombre}</h3></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-medium", vencimiento.clase)}>{vencimiento.texto}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{control.procesoCodigo} · {control.procesoNombre}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-2 py-1">{PERIODICIDAD_LABEL[control.periodicidad] ?? control.periodicidad}</span><span className="rounded-full bg-muted px-2 py-1">{control.riesgos.length + control.requisitos.length + control.documentos.length + control.indicadores.length} vínculos</span><span className="rounded-full bg-muted px-2 py-1">{control.ultimoResultado ? RESULTADO_LABEL[control.ultimoResultado] : "Sin ejecuciones"}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" className="min-h-11" disabled={control.estado !== "activo"} onClick={() => setEjecutando(control)}><CirclePlay className="h-4 w-4" />Ejecutar</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => abrir(control)}><Pencil className="h-4 w-4" />Editar</Button><Link href={`/controles/${control.id}/ejecuciones`} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium"><History className="h-4 w-4" />Ver historial y tratamiento</Link></div>
            </article>;
          })}
        </div>
        <div className="hidden overflow-hidden rounded-lg border border-border md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="w-10 px-3 py-2.5"><span className="sr-only">Detalle</span></th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Control</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Proceso</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Frecuencia</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Próxima ejecución</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground text-center">Ultimo resultado</th>
                  <th className="w-28 px-3 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((control) => {
                  const vencimiento = estadoVencimiento(control);
                  const abierto = expandido === control.id;
                  return (
                    <ControlFila
                      key={control.id}
                      control={control}
                      abierto={abierto}
                      vencimiento={vencimiento}
                      eliminando={eliminando === control.id}
                      onExpandir={() => setExpandido(abierto ? null : control.id)}
                      onEditar={() => abrir(control)}
                      onEjecutar={() => setEjecutando(control)}
                      onRetirar={() => retirar(control)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      ) : controles.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No hay controles que coincidan con los filtros.</div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ShieldCheck className="mb-3 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">Todavía no hay controles definidos</p>
          <p className="mt-1 max-w-lg text-xs text-muted-foreground">Crea el primer control y vinculalo con los riesgos y requisitos que aborda.</p>
          <Button size="sm" className="mt-4" onClick={() => abrir(null)}><Plus className="h-4 w-4" />Crear control</Button>
        </div>
      )}

      {formAbierto && (
        <ControlFormModal
          control={editando}
          opciones={opciones}
          procesoInicial={procesoFiltro || undefined}
          onClose={() => { setFormAbierto(false); setEditando(null); }}
          onSaved={() => router.refresh()}
        />
      )}
      {ejecutando && (
        <EjecucionControlModal control={ejecutando} onClose={() => setEjecutando(null)} onSaved={() => router.refresh()} />
      )}
    </div>
  );
}

function ControlFila({
  control,
  abierto,
  vencimiento,
  eliminando,
  onExpandir,
  onEditar,
  onEjecutar,
  onRetirar,
}: {
  control: Control;
  abierto: boolean;
  vencimiento: { texto: string; clase: string };
  eliminando: boolean;
  onExpandir: () => void;
  onEditar: () => void;
  onEjecutar: () => void;
  onRetirar: () => void;
}) {
  const totalVinculos = control.riesgos.length + control.requisitos.length + control.documentos.length + control.indicadores.length;
  return (
    <>
      <tr className="border-b border-border last:border-b-0">
        <td className="px-3 py-3 align-top">
          <button type="button" onClick={onExpandir} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={abierto ? "Ocultar detalle" : "Ver detalle"}>
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-3 py-3 align-top">
          <p className="font-medium">{control.nombre}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{control.codigo} · {control.tipo}</p>
        </td>
        <td className="px-3 py-3 align-top">
          <Link href={`/procesos/${encodeURIComponent(control.procesoCodigo)}`} className="hover:underline">{control.procesoNombre}</Link>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{control.procesoCodigo}</p>
        </td>
        <td className="px-3 py-3 align-top text-muted-foreground">{PERIODICIDAD_LABEL[control.periodicidad] ?? control.periodicidad}</td>
        <td className="px-3 py-3 align-top"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", vencimiento.clase)}>{vencimiento.texto}</span></td>
        <td className="px-3 py-3 text-center align-top">
          {control.ultimoResultado ? <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", RESULTADO_COLOR[control.ultimoResultado])}>{RESULTADO_LABEL[control.ultimoResultado]}</span> : <span className="text-xs text-muted-foreground">Sin ejecuciones</span>}
        </td>
        <td className="px-3 py-3 align-top">
          <div className="flex justify-end gap-1">
            <Link href={`/controles/${control.id}/ejecuciones`} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Ejecuciones y tratamiento" aria-label="Ejecuciones y tratamiento"><History className="h-4 w-4" /></Link>
            <button type="button" onClick={onEjecutar} disabled={control.estado !== "activo"} className="rounded p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40" title="Registrar ejecución" aria-label="Registrar ejecución"><CirclePlay className="h-4 w-4" /></button>
            <button type="button" onClick={onEditar} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={onRetirar} disabled={eliminando} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Retirar" aria-label="Retirar">{eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
          </div>
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-border bg-muted/20">
          <td />
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-5 md:grid-cols-4">
              <DetalleVinculo titulo="Riesgos" items={control.riesgos} />
              <DetalleVinculo titulo="Requisitos" items={control.requisitos.map((item) => ({ ...item, codigo: `${item.normaCodigo} ${item.clausula}` }))} />
              <DetalleVinculo titulo="Documentos" items={control.documentos} iconoDocumento />
              <DetalleVinculo titulo="Indicadores" items={control.indicadores} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>{totalVinculos} vínculo{totalVinculos === 1 ? "" : "s"}</span>
              <span>Responsable: {control.responsableNombre ?? "Sin asignar"}</span>
              <span>Evidencia: {control.requiereEvidencia ? "obligatoria" : "opcional"}</span>
              {control.ultimaEjecucion && <span>Última ejecución: {new Date(control.ultimaEjecucion).toLocaleDateString("es-AR")}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetalleVinculo({ titulo, items, iconoDocumento = false }: { titulo: string; items: Array<{ id: string; codigo: string; nombre: string }>; iconoDocumento?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{iconoDocumento && <FileCheck2 className="h-3.5 w-3.5" />}{titulo} <span className="font-normal">({items.length})</span></p>
      {items.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Sin vínculos</p> : (
        <ul className="mt-2 space-y-1.5">
          {items.slice(0, 5).map((item) => <li key={item.id} className="truncate text-xs" title={`${item.codigo} ${item.nombre}`}><span className="font-mono text-muted-foreground">{item.codigo}</span> {item.nombre}</li>)}
          {items.length > 5 && <li className="text-xs text-muted-foreground">y {items.length - 5} más</li>}
        </ul>
      )}
    </div>
  );
}
