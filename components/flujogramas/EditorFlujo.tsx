"use client";

import { useState, useTransition } from "react";
import type { NodoFlujo, AristaFlujo, PuestoRef, TipoBpmn, Marcador } from "@/lib/api/flujogramas-tipos";
import {
  reasignarProceso, reasignarPuesto, editarPaso, cambiarDestinoArista,
  crearArista, eliminarArista, type EdicionPaso,
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
  paso, puestos, pasosHermanos, aristasSalientes,
}: {
  paso: NodoFlujo;
  puestos: PuestoRef[];
  pasosHermanos: NodoFlujo[];
  aristasSalientes: AristaFlujo[];
}) {
  const { pending, msg, correr } = useAccion();

  const [puesto, setPuesto] = useState(paso.puestoId ?? "");
  const [titulo, setTitulo] = useState(paso.titulo);
  const [tipo, setTipo] = useState<TipoBpmn>(paso.tipoBpmn ?? "tarea");
  const [marcador, setMarcador] = useState<Marcador>(paso.marcador);
  const [riesgo, setRiesgo] = useState(paso.codRiesgo ?? "");

  const otros = pasosHermanos.filter((p) => p.id !== paso.id);

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar paso</p>

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

      {/* Secuencia: destino de cada arista saliente */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Secuencia (a qué paso apunta)</p>
        {aristasSalientes.length === 0 && <p className="text-sm text-muted-foreground">Este paso no tiene salidas. Agregá una abajo.</p>}
        {aristasSalientes.map((a) => (
          <EditorArista key={a.id} arista={a} otros={otros} correr={correr} pending={pending} />
        ))}
        <NuevaArista pasoId={paso.id} otros={otros} correr={correr} pending={pending} />
      </div>

      <Aviso msg={msg} />
    </div>
  );
}

function EditorArista({
  arista, otros, correr, pending,
}: {
  arista: AristaFlujo;
  otros: NodoFlujo[];
  correr: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void;
  pending: boolean;
}) {
  const [destino, setDestino] = useState(arista.destinoId);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {arista.etiqueta && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{arista.etiqueta}</span>}
      <span className="text-sm text-muted-foreground">→</span>
      <select value={destino} onChange={(e) => setDestino(e.target.value)} className="min-w-[200px] rounded-md border border-border bg-background px-2 py-1 text-sm">
        {otros.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.titulo.slice(0, 30)}</option>)}
        {/* incluir el destino actual aunque no esté en hermanos (por si apunta fuera) */}
        {!otros.some((o) => o.id === arista.destinoId) && <option value={arista.destinoId}>(destino actual)</option>}
      </select>
      <button disabled={pending || destino === arista.destinoId} onClick={() => correr(() => cambiarDestinoArista(arista.id, destino), "Secuencia corregida.")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Cambiar</button>
      <button disabled={pending} onClick={() => correr(() => eliminarArista(arista.id), "Conexión eliminada.")} className="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
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
