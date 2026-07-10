"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  crearProcesoFlujograma, crearSubproceso, importarRelevamiento,
  type FilaImport,
} from "@/app/(app)/flujogramas/actions";

// ── Crear proceso-flujograma nuevo ──
export function CrearProceso({ procesosSgi }: { procesosSgi: { id: string; nombre: string }[] }) {
  const [titulo, setTitulo] = useState("");
  const [procId, setProcId] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nuevo flujograma</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-muted-foreground">Nombre del flujograma</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ej. Recepción de mercadería" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Proceso del SGI</label>
          <select value={procId} onChange={(e) => setProcId(e.target.value)} className="mt-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
            <option value="">— vincular luego —</option>
            {procesosSgi.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <button
          disabled={pending || !titulo.trim()}
          onClick={() => start(async () => {
            const r = await crearProcesoFlujograma(titulo, procId || null);
            setMsg(r.ok ? "Flujograma creado." : r.error ?? "Error");
            if (r.ok) setTitulo("");
          })}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear flujograma"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

// ── Crear subproceso dentro de un proceso ──
export function CrearSubproceso({ procesoFlujogramaId }: { procesoFlujogramaId: string }) {
  const [titulo, setTitulo] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="text-xs text-muted-foreground">Nuevo subproceso (etapa)</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ej. Control de calidad" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
        </div>
        <button
          disabled={pending || !titulo.trim()}
          onClick={() => start(async () => {
            const r = await crearSubproceso(procesoFlujogramaId, titulo);
            setMsg(r.ok ? "Subproceso creado." : r.error ?? "Error");
            if (r.ok) setTitulo("");
          })}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Creando…" : "Agregar subproceso"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

// ── Importar Excel a un subproceso ──
const COLUMNAS = ["id_paso", "titulo", "tipo_bpmn", "puesto", "paso_siguiente", "rama_condicion", "documento"];

export function ImportarExcel({ subprocesoId }: { subprocesoId: string }) {
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null); setResultado(null); setFilas([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
        if (json.length === 0) { setError("El archivo no tiene filas."); return; }
        // validar columnas mínimas
        const cols = Object.keys(json[0]);
        if (!cols.includes("id_paso") || !cols.includes("titulo")) {
          setError(`Faltan columnas obligatorias. El Excel debe tener al menos: id_paso, titulo. Encontradas: ${cols.join(", ")}`);
          return;
        }
        const parsed: FilaImport[] = json.map((r) => ({
          id_paso: String(r.id_paso ?? "").trim(),
          titulo: String(r.titulo ?? "").trim(),
          tipo_bpmn: String(r.tipo_bpmn ?? "").trim(),
          puesto: String(r.puesto ?? "").trim(),
          paso_siguiente: String(r.paso_siguiente ?? "").trim(),
          rama_condicion: String(r.rama_condicion ?? "").trim(),
          documento: String(r.documento ?? "").trim(),
        })).filter((f) => f.id_paso || f.titulo);
        setFilas(parsed);
      } catch {
        setError("No se pudo leer el archivo. ¿Es un .xlsx válido?");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function importar() {
    start(async () => {
      const r = await importarRelevamiento(subprocesoId, filas);
      if (r.ok) {
        setResultado(`Importado: ${r.creados.pasos} pasos, ${r.creados.aristas} conexiones, ${r.creados.dataObjects} documentos.`);
        setFilas([]); setNombreArchivo("");
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importar desde Excel</p>
      <p className="mb-2 text-xs text-muted-foreground">
        Columnas: <span className="font-mono">{COLUMNAS.join(", ")}</span>. Obligatorias: id_paso, titulo.
        Usá la plantilla MSU_Plantilla_Procesos.xlsx.
      </p>
      <input type="file" accept=".xlsx,.xls" onChange={onArchivo} className="text-sm" />
      {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {filas.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium">Previsualización de {nombreArchivo}: {filas.length} filas</p>
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  {COLUMNAS.map((c) => <th key={c} className="px-2 py-1 font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 50).map((f, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-2 py-1">{f.id_paso}</td>
                    <td className="px-2 py-1">{f.titulo}</td>
                    <td className="px-2 py-1">{f.tipo_bpmn}</td>
                    <td className="px-2 py-1">{f.puesto}</td>
                    <td className="px-2 py-1">{f.paso_siguiente}</td>
                    <td className="px-2 py-1">{f.rama_condicion}</td>
                    <td className="px-2 py-1">{f.documento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filas.length > 50 && <p className="mt-1 text-xs text-muted-foreground">Mostrando 50 de {filas.length} filas.</p>}
          <div className="mt-3 flex items-center gap-2">
            <button disabled={pending} onClick={importar} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {pending ? "Importando…" : `Importar ${filas.length} pasos a este subproceso`}
            </button>
            <button onClick={() => { setFilas([]); setNombreArchivo(""); }} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}
      {resultado && <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">{resultado}</p>}
    </div>
  );
}
