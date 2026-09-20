"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Search } from "lucide-react";
import type {
  Control,
  OpcionesControl,
  TipoControl,
} from "@/lib/api/controles";
import { periodicidadesControl } from "@/lib/schemas/control";
import { guardarControl, type EstadoControlAction } from "@/app/(app)/controles/actions";
import { Button } from "@/components/ui/button";
import {
  ModalBody,
  ModalError,
  ModalFooter,
  ModalHeader,
  ModalShell,
  MODAL_FORM_CLASS,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PASOS = ["Definición", "Responsable y frecuencia", "Vínculos"] as const;

const PERIODICIDAD_LABEL: Record<string, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  ad_hoc: "Cuando sea necesario",
};

function SubmitButton({ edicion }: { edicion: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
      ) : (
        <><Save className="h-4 w-4" />{edicion ? "Guardar cambios" : "Crear control"}</>
      )}
    </Button>
  );
}

type OpcionVinculo = { id: string; codigo: string; nombre: string };

function SelectorMultiple({
  titulo,
  descripcion,
  opciones,
  seleccion,
  onChange,
  vacio,
}: {
  titulo: string;
  descripcion: string;
  opciones: OpcionVinculo[];
  seleccion: string[];
  onChange: (ids: string[]) => void;
  vacio: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    if (!consulta) return opciones;
    return opciones.filter((opcion) =>
      `${opcion.codigo} ${opcion.nombre}`.toLowerCase().includes(consulta),
    );
  }, [busqueda, opciones]);

  function alternar(id: string) {
    onChange(seleccion.includes(id) ? seleccion.filter((valor) => valor !== id) : [...seleccion, id]);
  }

  return (
    <div className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
      {opciones.length > 6 && (
        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar en {titulo}</span>
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Buscar..."
          />
        </label>
      )}
      {visibles.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-md border border-border">
          {visibles.map((opcion) => (
            <label
              key={opcion.id}
              className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={seleccion.includes(opcion.id)}
                onChange={() => alternar(opcion.id)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="min-w-0 text-sm">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{opcion.codigo}</span>
                <span>{opcion.nombre}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      {seleccion.length > 0 && (
        <p className="text-xs font-medium text-primary">{seleccion.length} seleccionado{seleccion.length === 1 ? "" : "s"}</p>
      )}
    </div>
  );
}

export function ControlFormModal({
  control,
  opciones,
  procesoInicial,
  onClose,
  onSaved,
}: {
  control: Control | null;
  opciones: OpcionesControl;
  procesoInicial?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, formAction] = useFormState<EstadoControlAction, FormData>(guardarControl, null);
  const [paso, setPaso] = useState(0);
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [codigo, setCodigo] = useState(control?.codigo ?? "");
  const [nombre, setNombre] = useState(control?.nombre ?? "");
  const [procesoId, setProcesoId] = useState(control?.procesoId ?? procesoInicial ?? "");
  const [tipo, setTipo] = useState<TipoControl>(control?.tipo ?? "preventivo");
  const [periodicidad, setPeriodicidad] = useState(control?.periodicidad ?? "mensual");
  const [riesgoIds, setRiesgoIds] = useState(control?.riesgos.map((item) => item.id) ?? []);
  const [requisitoIds, setRequisitoIds] = useState(control?.requisitos.map((item) => item.id) ?? []);
  const [documentoIds, setDocumentoIds] = useState(control?.documentos.map((item) => item.id) ?? []);
  const [indicadorIds, setIndicadorIds] = useState(control?.indicadores.map((item) => item.id) ?? []);

  const riesgosProceso = opciones.riesgos.filter((riesgo) => riesgo.procesoId === procesoId);
  const indicadoresProceso = opciones.indicadores.filter((indicador) => indicador.procesoId === procesoId);
  const documentosOrdenados = [...opciones.documentos].sort((a, b) => {
    const aMismo = a.procesoId === procesoId ? 0 : 1;
    const bMismo = b.procesoId === procesoId ? 0 : 1;
    return aMismo - bMismo || a.codigo.localeCompare(b.codigo);
  });

  useEffect(() => {
    if (estado?.ok) {
      onSaved();
      onClose();
    }
  }, [estado, onClose, onSaved]);

  useEffect(() => {
    setRiesgoIds((actuales) => actuales.filter((id) => riesgosProceso.some((riesgo) => riesgo.id === id)));
    setIndicadorIds((actuales) => actuales.filter((id) => indicadoresProceso.some((indicador) => indicador.id === id)));
    // Solo se ejecuta al cambiar de proceso para limpiar vinculos incoherentes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procesoId]);

  function validar(actual: number): string | null {
    if (actual === 0) {
      if (!codigo.trim()) return "El código es obligatorio.";
      if (!nombre.trim()) return "El nombre es obligatorio.";
      if (!procesoId) return "Elegí un proceso.";
    }
    if (actual === 1 && periodicidad !== "ad_hoc") {
      const fecha = document.querySelector<HTMLInputElement>("#proximaEjecucion")?.value;
      if (!fecha) return "Indicá la próxima ejecución.";
    }
    if (actual === 2 && riesgoIds.length === 0 && requisitoIds.length === 0) {
      return "Vinculá al menos un riesgo o requisito.";
    }
    return null;
  }

  function avanzar() {
    const mensaje = validar(paso);
    if (mensaje) {
      setErrorPaso(mensaje);
      return;
    }
    setErrorPaso(null);
    setPaso((actual) => Math.min(PASOS.length - 1, actual + 1));
  }

  function validarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    for (let indice = 0; indice < PASOS.length; indice += 1) {
      const mensaje = validar(indice);
      if (mensaje) {
        evento.preventDefault();
        setPaso(indice);
        setErrorPaso(mensaje);
        return;
      }
    }
  }

  return (
    <ModalShell abierto onClose={onClose} maxWidth="max-w-3xl">
      <ModalHeader>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          {control ? "Editar control" : "Nuevo control"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Definí el control una sola vez y reutilizalo en sus riesgos y requisitos.
        </p>
        <div className="mt-5 flex items-center gap-1.5">
          {PASOS.map((nombrePaso, indice) => (
            <div key={nombrePaso} className="flex flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => indice <= paso && setPaso(indice)}
                className="flex items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    indice === paso && "bg-foreground text-background",
                    indice < paso && "bg-emerald-100 text-emerald-700",
                    indice > paso && "border border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {indice < paso ? <Check className="h-3.5 w-3.5" /> : indice + 1}
                </span>
                <span className={cn("hidden text-xs sm:inline", indice === paso ? "font-medium" : "text-muted-foreground")}>{nombrePaso}</span>
              </button>
              {indice < PASOS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>
      </ModalHeader>

      <form action={formAction} onSubmit={validarEnvio} className={MODAL_FORM_CLASS}>
        <ModalBody className="space-y-4 pb-3">
          {control && <input type="hidden" name="id" value={control.id} />}
          <input type="hidden" name="riesgoIds" value={JSON.stringify(riesgoIds)} />
          <input type="hidden" name="requisitoIds" value={JSON.stringify(requisitoIds)} />
          <input type="hidden" name="documentoIds" value={JSON.stringify(documentoIds)} />
          <input type="hidden" name="indicadorIds" value={JSON.stringify(indicadorIds)} />

          <div hidden={paso !== 0} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                <input
                  id="codigo"
                  name="codigo"
                  value={codigo}
                  onChange={(evento) => setCodigo(evento.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="CTL-CMP-01"
                  className={`${INPUT} font-mono`}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="nombre" className="text-sm font-medium">Nombre</label>
                <input id="nombre" name="nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} className={INPUT} required />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="procesoId" className="text-sm font-medium">Proceso</label>
              <select id="procesoId" name="procesoId" value={procesoId} onChange={(evento) => setProcesoId(evento.target.value)} className={INPUT} required>
                <option value="">Elegí un proceso…</option>
                {opciones.procesos.map((proceso) => <option key={proceso.id} value={proceso.id}>{proceso.codigo} - {proceso.nombre}</option>)}
              </select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tipo</legend>
              <div className="grid grid-cols-3 rounded-md border border-border p-1">
                {(["preventivo", "detectivo", "correctivo"] as TipoControl[]).map((valor) => (
                  <label key={valor} className={cn("cursor-pointer rounded px-3 py-2 text-center text-sm capitalize", tipo === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="sr-only" />
                    {valor}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="descripcion" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(opc.)</span></label>
                <textarea id="descripcion" name="descripcion" rows={3} defaultValue={control?.descripcion ?? ""} className={INPUT} />
              </div>
              <div className="space-y-2">
                <label htmlFor="objetivo" className="text-sm font-medium">Objetivo <span className="text-muted-foreground">(opc.)</span></label>
                <textarea id="objetivo" name="objetivo" rows={3} defaultValue={control?.objetivo ?? ""} className={INPUT} />
              </div>
            </div>
          </div>

          <div hidden={paso !== 1} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="responsablePuestoId" className="text-sm font-medium">Puesto responsable</label>
                <select id="responsablePuestoId" name="responsablePuestoId" defaultValue={control?.responsablePuestoId ?? ""} className={INPUT}>
                  <option value="">Sin asignar</option>
                  {opciones.puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.codigo} - {puesto.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="estado" className="text-sm font-medium">Estado</label>
                <select id="estado" name="estado" defaultValue={control?.estado ?? "activo"} className={INPUT}>
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="periodicidad" className="text-sm font-medium">Frecuencia</label>
                <select id="periodicidad" name="periodicidad" value={periodicidad} onChange={(evento) => setPeriodicidad(evento.target.value)} className={INPUT}>
                  {periodicidadesControl.map((valor) => <option key={valor} value={valor}>{PERIODICIDAD_LABEL[valor]}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="proximaEjecucion" className="text-sm font-medium">Próxima ejecución</label>
                <input id="proximaEjecucion" name="proximaEjecucion" type="date" disabled={periodicidad === "ad_hoc"} defaultValue={control?.proximaEjecucion ?? ""} className={INPUT} />
              </div>
              <div className="space-y-2">
                <label htmlFor="anticipacionDias" className="text-sm font-medium">Avisar antes</label>
                <div className="flex items-center gap-2">
                  <input id="anticipacionDias" name="anticipacionDias" type="number" min={0} max={90} defaultValue={control?.anticipacionDias ?? 7} className={INPUT} />
                  <span className="text-sm text-muted-foreground">días</span>
                </div>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-4 py-3">
              <input type="checkbox" name="requiereEvidencia" defaultChecked={control?.requiereEvidencia ?? true} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
              <span>
                <span className="block text-sm font-medium">Exigir descripción de evidencia</span>
                <span className="block text-xs text-muted-foreground">La ejecución no se podrá cerrar sin indicar qué se verificó.</span>
              </span>
            </label>
            <div className="space-y-2">
              <label htmlFor="instrucciones" className="text-sm font-medium">Instrucciones de ejecución <span className="text-muted-foreground">(opc.)</span></label>
              <textarea id="instrucciones" name="instrucciones" rows={4} defaultValue={control?.instrucciones ?? ""} className={INPUT} />
            </div>
          </div>

          <div hidden={paso !== 2} className="space-y-4">
            <SelectorMultiple titulo="Riesgos del proceso" descripcion="Seleccioná los riesgos que reduce o detecta este control." opciones={riesgosProceso} seleccion={riesgoIds} onChange={setRiesgoIds} vacio={procesoId ? "Este proceso no tiene riesgos activos." : "Primero elegí un proceso."} />
            <SelectorMultiple titulo="Requisitos normativos" descripcion="Un mismo control puede responder a varias normas y cláusulas." opciones={opciones.requisitos.map((item) => ({ ...item, codigo: `${item.normaCodigo} ${item.clausula}` }))} seleccion={requisitoIds} onChange={setRequisitoIds} vacio="No hay requisitos activos." />
            <SelectorMultiple titulo="Documentos vigentes" descripcion="Procedimientos o formularios que definen y respaldan el control." opciones={documentosOrdenados} seleccion={documentoIds} onChange={setDocumentoIds} vacio="No hay documentos aprobados." />
            <SelectorMultiple titulo="Indicadores del proceso" descripcion="Métricas que permiten comprobar si el control funciona." opciones={indicadoresProceso} seleccion={indicadorIds} onChange={setIndicadorIds} vacio={procesoId ? "Este proceso no tiene indicadores activos." : "Primero elegí un proceso."} />
          </div>
        </ModalBody>

        <ModalFooter>
          <ModalError mensaje={errorPaso} />
          <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
          <div className="flex items-center gap-3">
            {paso > 0 ? (
              <Button type="button" variant="outline" onClick={() => { setPaso((actual) => actual - 1); setErrorPaso(null); }}><ArrowLeft className="h-4 w-4" />Atrás</Button>
            ) : (
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            )}
            <div className="flex-1" />
            {paso === PASOS.length - 1 ? <SubmitButton edicion={Boolean(control)} /> : <Button type="button" onClick={avanzar}>Siguiente<ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
