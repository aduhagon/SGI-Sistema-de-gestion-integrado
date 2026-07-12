"use client";

import { useState, useTransition } from "react";
import type { NodoFlujo, AristaFlujo, PuestoRef, TipoBpmn, Marcador, DataObject, SubtipoEvento } from "@/lib/api/flujogramas-tipos";
import { SUBTIPO_EVENTO_LABEL } from "@/lib/api/flujogramas-tipos";
type DocumentoRef = { id: string; codigo: string; titulo: string; procesoIds?: string[] };
import {
  reasignarProceso, reasignarPuesto, editarPaso, cambiarDestinoArista,
  crearArista, eliminarArista, type EdicionPaso,
  crearPaso, borrarPasoCosiendo, crearDataObject, editarDataObject, eliminarDataObject,
  cambiarOrigenArista, crearAristaEntrante, insertarPasoEntre,
  editarSubtipoEvento, insertarGatewayEnSalidas,
  moverPaso, limpiarAristasDuplicadas, editarEtiquetaArista,
  moverSubproceso,
} from "@/app/(app)/flujogramas/actions";

type ProcesoOpc = { id: string; nombre: string };

function useAccion() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, okTexto: string) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) setMsg({ tipo: "ok", texto: okTexto });
      else setMsg({ tipo: "err", texto: r.error ?? "Error" });
    });
  };
  return { pending, msg, correr };
}

function Aviso({ msg }: { msg: { tipo: "ok" | "err"; texto: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`mt-2 rounded-md px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {msg.texto}
    </div>
  );
}

// Selector de documento con optgroups: los del proceso primero, el resto del maestro debajo.
function SelectorDoc({
  value, onChange, delProceso, otros,
}: {
  value: string;
  onChange: (v: string) => void;
  delProceso: DocumentoRef[];
  otros: DocumentoRef[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-[170px] rounded-md border border-border bg-background px-2 py-1 text-xs">
      <option value="">— sin vincular —</option>
      {delProceso.length > 0 && (
        <optgroup label="Del proceso">
          {delProceso.map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.titulo.slice(0, 24)}</option>)}
        </optgroup>
      )}
      {otros.length > 0 && (
        <optgroup label={delProceso.length > 0 ? "Otros documentos" : "Documentos"}>
          {otros.map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.titulo.slice(0, 24)}</option>)}
        </optgroup>
      )}
    </select>
  );
}

// Ordena documentos: los del proceso del paso primero, el resto del maestro debajo.
function ordenarDocs(documentos: DocumentoRef[], procesoIdSgi: string | null): { delProceso: DocumentoRef[]; otros: DocumentoRef[] } {
  if (!procesoIdSgi) return { delProceso: [], otros: documentos };
  const delProceso: DocumentoRef[] = [];
  const otros: DocumentoRef[] = [];
  for (const d of documentos) {
    if ((d.procesoIds ?? []).includes(procesoIdSgi)) delProceso.push(d);
    else otros.push(d);
  }
  return { delProceso, otros };
}

// ── Editor de nodo-proceso: reasignar proceso del SGI ──
export function EditorProceso({ nodo, procesos }: { nodo: NodoFlujo; procesos: ProcesoOpc[] }) {
  const [sel, setSel] = useState(nodo.procesoId ?? "");
  const { pending, msg, correr } = useAccion();
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar · vínculo con proceso del SGI</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="min-w-[240px] rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <option value="">— sin vincular —</option>
          {procesos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button
          disabled={pending || sel === (nodo.procesoId ?? "")}
          onClick={() => correr(() => reasignarProceso(nodo.id, sel), "Proceso reasignado.")}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <Aviso msg={msg} />
    </div>
  );
}

// ── Editor de paso: carril (puesto), campos y secuencia ──
export function EditorPaso({
  paso, puestos, pasosHermanos, aristasSalientes, aristasEntrantes = [], dataObjects = [], documentos = [], procesoIdSgi = null,
}: {
  paso: NodoFlujo;
  puestos: PuestoRef[];
  pasosHermanos: NodoFlujo[];
  aristasSalientes: AristaFlujo[];
  aristasEntrantes?: AristaFlujo[];
  dataObjects?: DataObject[];
  documentos?: DocumentoRef[];
  procesoIdSgi?: string | null;
}) {
  const { pending, msg, correr } = useAccion();

  const [puesto, setPuesto] = useState(paso.puestoId ?? "");
  const [titulo, setTitulo] = useState(paso.titulo);
  const [tipo, setTipo] = useState<TipoBpmn>(paso.tipoBpmn ?? "tarea");
  const [marcador, setMarcador] = useState<Marcador>(paso.marcador);
  const [riesgo, setRiesgo] = useState(paso.codRiesgo ?? "");
  const [subtipo, setSubtipo] = useState<SubtipoEvento>(paso.subtipoEvento);

  const otros = pasosHermanos.filter((p) => p.id !== paso.id);

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar paso</p>

      {/* Reordenar posición en el swimlane */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Posición en el flujo:</span>
        <button disabled={pending} onClick={() => correr(() => moverPaso(paso.id, -1), "Paso movido a la izquierda.")} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50" title="Mover antes">◀</button>
        <button disabled={pending} onClick={() => correr(() => moverPaso(paso.id, 1), "Paso movido a la derecha.")} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50" title="Mover después">▶</button>
        <span className="text-xs text-muted-foreground">(orden actual: {paso.orden})</span>
      </div>

      {/* Carril / puesto */}
      <div>
        <label className="text-xs text-muted-foreground">Puesto responsable (carril)</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <select value={puesto} onChange={(e) => setPuesto(e.target.value)} className="min-w-[240px] rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="">— sin asignar —</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo.startsWith("GEN-") ? `${p.nombre} (genérico)` : p.nombre}</option>
            ))}
          </select>
          <button
            disabled={pending || puesto === (paso.puestoId ?? "")}
            onClick={() => correr(() => reasignarPuesto(paso.id, puesto), "Carril reasignado.")}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Guardar carril
          </button>
        </div>
      </div>

      {/* Campos del paso */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo BPMN</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoBpmn)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="inicio">Inicio</option>
            <option value="tarea">Tarea</option>
            <option value="decision">Decisión</option>
            <option value="fin">Fin</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Marcador</label>
          <select value={marcador} onChange={(e) => setMarcador(e.target.value as Marcador)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="sin_marcador">— ninguno —</option>
            <option value="user">Usuario</option>
            <option value="service">Servicio</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Código de riesgo</label>
          <input value={riesgo} onChange={(e) => setRiesgo(e.target.value)} placeholder="ej. R-Arr-5" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
        </div>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          const cambios: EdicionPaso = { titulo, tipoBpmn: tipo, marcador, codRiesgo: riesgo };
          correr(() => editarPaso(paso.id, cambios), "Paso actualizado.");
        }}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar cambios del paso"}
      </button>

      {/* Clasificación BPMN del evento (solo inicio/fin) */}
      {(tipo === "inicio" || tipo === "fin") && (
        <div className="border-t border-border pt-3">
          <label className="text-xs text-muted-foreground">Tipo de evento BPMN</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select value={subtipo} onChange={(e) => setSubtipo(e.target.value as SubtipoEvento)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
              {(Object.keys(SUBTIPO_EVENTO_LABEL) as SubtipoEvento[]).map((s) => (
                <option key={s} value={s}>{SUBTIPO_EVENTO_LABEL[s]}</option>
              ))}
            </select>
            <button disabled={pending || subtipo === paso.subtipoEvento} onClick={() => correr(() => editarSubtipoEvento(paso.id, subtipo), "Evento clasificado.")} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">Guardar tipo de evento</button>
          </div>
        </div>
      )}

      {/* Gateway automático: si una TAREA tiene 2+ salidas, ofrecer insertar gateway */}
      {tipo === "tarea" && aristasSalientes.length >= 2 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-800">Esta tarea tiene {aristasSalientes.length} salidas sin un gateway. En BPMN, la divergencia debería pasar por un gateway (rombo).</p>
          <button disabled={pending} onClick={() => correr(() => insertarGatewayEnSalidas(paso.id), "Gateway insertado: las salidas ahora pasan por el rombo.")} className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Insertar gateway automáticamente</button>
        </div>
      )}

      {/* Secuencia: destino de cada arista saliente */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Secuencia (a qué paso apunta)</p>
        {aristasSalientes.length === 0 && <p className="text-sm text-muted-foreground">Este paso no tiene salidas. Agregá una abajo.</p>}
        {aristasSalientes.map((a) => (
          <EditorArista key={a.id} arista={a} otros={otros} correr={correr} pending={pending} esDecision={paso.tipoBpmn === "decision"} />
        ))}
        <NuevaArista pasoId={paso.id} otros={otros} correr={correr} pending={pending} />
        <button disabled={pending} onClick={() => correr(() => limpiarAristasDuplicadas(paso.id), "Conexiones duplicadas eliminadas.")} className="mt-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">Limpiar conexiones duplicadas</button>
      </div>

      {/* Secuencia entrante: quién apunta a este paso */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Entra desde (qué pasos apuntan a este)</p>
        {aristasEntrantes.length === 0 && <p className="text-sm text-muted-foreground">Ningún paso apunta a este todavía.</p>}
        {aristasEntrantes.map((a) => (
          <EditorAristaEntrante key={a.id} arista={a} otros={otros} correr={correr} pending={pending} />
        ))}
        <NuevaAristaEntrante pasoId={paso.id} otros={otros} correr={correr} pending={pending} />
      </div>

      {/* Insertar este paso entre dos consecutivos */}
      <div className="border-t border-border pt-3">
        <InsertarEntre pasoId={paso.id} otros={otros} correr={correr} pending={pending} />
      </div>

      {/* Data Objects (documentos entrada/salida) */}
      <div className="border-t border-border pt-3">
        <p className="mb-1 text-xs text-muted-foreground">Documentos (entrada / salida)</p>
        {dataObjects.map((d) => (
          <EditorDataObject key={d.id} data={d} documentos={documentos} procesoIdSgi={procesoIdSgi} correr={correr} pending={pending} />
        ))}
        <NuevoDataObject nodoId={paso.id} documentos={documentos} procesoIdSgi={procesoIdSgi} correr={correr} pending={pending} />
      </div>

      {/* Borrar paso cosiendo el hueco */}
      <div className="border-t border-border pt-3">
        <ConfirmarBorrado pasoId={paso.id} correr={correr} pending={pending} />
      </div>

      <Aviso msg={msg} />
    </div>
  );
}

// ── Editar el origen de una arista entrante ──
function EditorAristaEntrante({
  arista, otros, correr, pending,
}: {
  arista: AristaFlujo;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [origen, setOrigen] = useState(arista.origenId);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-sm">
        {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 30)}</option>)}
        {!otros.some((o) => o.id === arista.origenId) && <option value={arista.origenId}>(origen actual)</option>}
      </select>
      <span className="text-sm text-muted-foreground">→ este paso</span>
      {arista.etiqueta && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{arista.etiqueta}</span>}
      <button disabled={pending || origen === arista.origenId} onClick={() => correr(() => cambiarOrigenArista(arista.id, origen), "Origen corregido.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Cambiar</button>
      <button disabled={pending} onClick={() => correr(() => eliminarArista(arista.id), "Conexión eliminada.")} className="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
    </div>
  );
}

// ── Alta de arista entrante ──
function NuevaAristaEntrante({
  pasoId, otros, correr, pending,
}: {
  pasoId: string;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [origen, setOrigen] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <span className="text-xs text-muted-foreground">+ entra desde</span>
      <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-sm">
        <option value="">— elegir paso —</option>
        {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 30)}</option>)}
      </select>
      <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="etiqueta (opcional)" className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs" />
      <button disabled={pending || !origen} onClick={() => correr(() => crearAristaEntrante(pasoId, origen, etiqueta || undefined), "Conexión creada.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Agregar</button>
    </div>
  );
}

// ── Insertar este paso entre dos consecutivos (A → este → B) ──
function InsertarEntre({
  pasoId, otros, correr, pending,
}: {
  pasoId: string;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">Insertar este paso entre dos consecutivos</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className="min-w-[170px] rounded-md border border-border bg-background px-2 py-1 text-sm">
          <option value="">— desde (A) —</option>
          {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 26)}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">→ [este] →</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className="min-w-[170px] rounded-md border border-border bg-background px-2 py-1 text-sm">
          <option value="">— hacia (B) —</option>
          {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 26)}</option>)}
        </select>
        <button disabled={pending || !a || !b || a === b} onClick={() => correr(() => insertarPasoEntre(pasoId, a, b), "Paso insertado entre A y B.")} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Insertar</button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Corta la conexión A→B y la reemplaza por A→este→B.</p>
    </div>
  );
}

// ── Editor de un data object existente ──
function EditorDataObject({
  data, documentos, procesoIdSgi, correr, pending,
}: {
  data: DataObject;
  documentos: DocumentoRef[];
  procesoIdSgi: string | null;
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [etiqueta, setEtiqueta] = useState(data.etiqueta);
  const [docId, setDocId] = useState(data.documentoId ?? "");
  const { delProceso, otros } = ordenarDocs(documentos, procesoIdSgi);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${data.direccion === "entrada" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
        {data.direccion}
      </span>
      <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className="min-w-[160px] rounded-md border border-border bg-background px-2 py-1 text-sm" />
      <SelectorDoc value={docId} onChange={setDocId} delProceso={delProceso} otros={otros} />
      <button disabled={pending || (etiqueta === data.etiqueta && docId === (data.documentoId ?? ""))} onClick={() => correr(() => editarDataObject(data.id, { etiqueta, documentoId: docId }), "Documento actualizado.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Guardar</button>
      <button disabled={pending} onClick={() => correr(() => eliminarDataObject(data.id), "Documento eliminado.")} className="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
    </div>
  );
}

// ── Alta de data object ──
function NuevoDataObject({
  nodoId, documentos, procesoIdSgi, correr, pending,
}: {
  nodoId: string;
  documentos: DocumentoRef[];
  procesoIdSgi: string | null;
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [dir, setDir] = useState<"entrada" | "salida">("entrada");
  const [etiqueta, setEtiqueta] = useState("");
  const [docId, setDocId] = useState("");
  const { delProceso, otros } = ordenarDocs(documentos, procesoIdSgi);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <span className="text-xs text-muted-foreground">+ documento</span>
      <select value={dir} onChange={(e) => setDir(e.target.value as "entrada" | "salida")} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
        <option value="entrada">entrada</option>
        <option value="salida">salida</option>
      </select>
      <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="etiqueta (texto libre)" className="min-w-[150px] rounded-md border border-border bg-background px-2 py-1 text-sm" />
      <SelectorDoc value={docId} onChange={setDocId} delProceso={delProceso} otros={otros} />
      <button disabled={pending || !etiqueta.trim()} onClick={() => { correr(() => crearDataObject(nodoId, dir, etiqueta, docId || undefined), "Documento agregado."); setEtiqueta(""); setDocId(""); }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Agregar</button>
    </div>
  );
}

// ── Confirmación de borrado (cose el hueco) ──
function ConfirmarBorrado({
  pasoId, correr, pending,
}: {
  pasoId: string;
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [confirmar, setConfirmar] = useState(false);
  if (!confirmar) {
    return (
      <button onClick={() => setConfirmar(true)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
        Eliminar este paso
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Se unirá el paso anterior con el siguiente. ¿Confirmás?</span>
      <button disabled={pending} onClick={() => correr(() => borrarPasoCosiendo(pasoId), "Paso eliminado y flujo cosido.")} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Sí, eliminar</button>
      <button onClick={() => setConfirmar(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Cancelar</button>
    </div>
  );
}

// ── Alta de pasos en un subproceso (nivel 2) ──
export function EditorSubproceso({
  subprocesoId, puestos, flujogramas = [], padreId = null,
}: {
  subprocesoId: string;
  puestos: PuestoRef[];
  flujogramas?: { id: string; titulo: string }[];
  padreId?: string | null;
}) {
  const { pending, msg, correr } = useAccion();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<"inicio" | "tarea" | "decision" | "fin">("tarea");
  const [puesto, setPuesto] = useState("");
  return (
    <>
    <MoverSubproceso
      subprocesoId={subprocesoId}
      flujogramas={flujogramas.filter((f) => f.id !== padreId)}
    />
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agregar paso al subproceso</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground">Título (verbo en infinitivo)</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ej. Registrar contrato" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "inicio" | "tarea" | "decision" | "fin")} className="mt-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="inicio">Inicio</option>
            <option value="tarea">Tarea</option>
            <option value="decision">Decisión</option>
            <option value="fin">Fin</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Puesto</label>
          <select value={puesto} onChange={(e) => setPuesto(e.target.value)} className="mt-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="">— sin asignar —</option>
            {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <button
          disabled={pending || !titulo.trim()}
          onClick={() => { correr(() => crearPaso(subprocesoId, { titulo, tipoBpmn: tipo, puestoId: puesto || null }), "Paso creado (sin conexiones; conectalo desde su ficha)."); setTitulo(""); }}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear paso"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">El paso se crea suelto. Después entrá a su ficha para conectarlo en la secuencia.</p>
      <Aviso msg={msg} />
    </div>
    </>
  );
}

// Mover el subproceso completo (con sus pasos y conexiones) a otro flujograma.
function MoverSubproceso({
  subprocesoId, flujogramas,
}: {
  subprocesoId: string;
  flujogramas: { id: string; titulo: string }[];
}) {
  const { pending, msg, correr } = useAccion();
  const [destino, setDestino] = useState("");
  const [abierto, setAbierto] = useState(false);

  if (flujogramas.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <span>Mover subproceso a otro flujograma</span>
        <span className="text-sm">{abierto ? "−" : "+"}</span>
      </button>

      {abierto && (
        <div className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground">Flujograma destino</label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">— elegir flujograma —</option>
                {flujogramas.map((f) => (
                  <option key={f.id} value={f.id}>{f.titulo}</option>
                ))}
              </select>
            </div>
            <button
              disabled={pending || !destino}
              onClick={() => {
                correr(
                  () => moverSubproceso(subprocesoId, destino),
                  "Subproceso movido. Se mudaron todos sus pasos y conexiones."
                );
                setDestino("");
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {pending ? "Moviendo…" : "Mover"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Se mueve el subproceso completo: sus pasos y las conexiones entre ellos viajan con él.
            Queda al final del flujograma destino.
          </p>
          <Aviso msg={msg} />
        </div>
      )}
    </div>
  );
}

function EditorArista({
  arista, otros, correr, pending, esDecision = false,
}: {
  arista: AristaFlujo;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
  esDecision?: boolean;
}) {
  const [destino, setDestino] = useState(arista.destinoId);
  const [etiqueta, setEtiqueta] = useState(arista.etiqueta ?? "");
  return (
    <div className="mt-1.5 rounded-md border border-border/60 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">→</span>
        <select value={destino} onChange={(e) => setDestino(e.target.value)} className="min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-sm">
          {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 30)}</option>)}
          {!otros.some((o) => o.id === arista.destinoId) && <option value={arista.destinoId}>(destino actual)</option>}
        </select>
        <button disabled={pending || destino === arista.destinoId} onClick={() => correr(() => cambiarDestinoArista(arista.id, destino), "Secuencia corregida.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Cambiar</button>
        <button disabled={pending} onClick={() => correr(() => eliminarArista(arista.id), "Conexión eliminada.")} className="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
      </div>
      {/* Etiqueta de la rama (útil sobre todo en decisiones) */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Etiqueta{esDecision ? " (rama)" : ""}:</span>
        {esDecision && (
          <>
            <button onClick={() => { setEtiqueta("Sí"); correr(() => editarEtiquetaArista(arista.id, "Sí"), "Rama etiquetada: Sí."); }} className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50">Sí</button>
            <button onClick={() => { setEtiqueta("No"); correr(() => editarEtiquetaArista(arista.id, "No"), "Rama etiquetada: No."); }} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">No</button>
          </>
        )}
        <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="texto libre" className="w-36 rounded-md border border-border bg-background px-2 py-1 text-xs" />
        <button disabled={pending || etiqueta === (arista.etiqueta ?? "")} onClick={() => correr(() => editarEtiquetaArista(arista.id, etiqueta), "Etiqueta guardada.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Guardar</button>
        {arista.etiqueta && <button disabled={pending} onClick={() => { setEtiqueta(""); correr(() => editarEtiquetaArista(arista.id, ""), "Etiqueta quitada."); }} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">Quitar etiqueta</button>}
      </div>
    </div>
  );
}

function NuevaArista({
  pasoId, otros, correr, pending,
}: {
  pasoId: string;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [destino, setDestino] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <span className="text-xs text-muted-foreground">+ nueva conexión</span>
      <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="etiqueta (opcional)" className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs" />
      <span className="text-sm text-muted-foreground">→</span>
      <select value={destino} onChange={(e) => setDestino(e.target.value)} className="min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-sm">
        <option value="">— elegir paso —</option>
        {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 30)}</option>)}
      </select>
      <button disabled={pending || !destino} onClick={() => correr(() => crearArista(pasoId, destino, etiqueta || undefined), "Conexión creada.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Agregar</button>
    </div>
  );
}
