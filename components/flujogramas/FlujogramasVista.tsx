"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type {
  NodoFlujo, AristaFlujo, DataObject, PuestoRef, GapSubproceso, EstadoGap,
} from "@/lib/api/flujogramas-tipos";
import { agregarEstado, evaluarEstiloNodo, formaDeNodo, puntoEnLado, pathOrtogonal, claseRama, asignarCanales, asignarLados, detectarSecuenciaRota } from "@/lib/api/flujogramas-tipos";
import { EditorProceso, EditorPaso, EditorSubproceso } from "@/components/flujogramas/EditorFlujo";
import { CrearProceso, CrearSubproceso, ImportarExcel } from "@/components/flujogramas/GestionFlujos";
import { PanelVersionado } from "@/components/flujogramas/PanelVersionado";
import { ModalFlujograma } from "@/components/flujogramas/ModalFlujograma";
import { PanelCoberturaErp } from "@/components/flujogramas/PanelCoberturaErp";

type Nivel = 0 | 1 | 2 | 3;
type Sel = { nivel: Nivel; procId: string | null; subId: string | null; pasoId: string | null };

const COLOR: Record<EstadoGap, string> = {
  rojo: "#dc2626", amarillo: "#d97706", verde: "#16a34a", sindatos: "#9ca3af",
};
const PUNTO: Record<EstadoGap, string> = { rojo: "🔴", amarillo: "🟡", verde: "🟢", sindatos: "⚪" };

// Divide un texto en hasta maxLineas líneas de ~maxChars, sin cortar palabras.
function envolverTexto(texto: string, maxChars: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const w of palabras) {
    if ((actual + " " + w).trim().length <= maxChars) {
      actual = (actual + " " + w).trim();
    } else {
      if (actual) lineas.push(actual);
      actual = w;
      if (lineas.length === maxLineas - 1) break;
    }
  }
  if (actual && lineas.length < maxLineas) lineas.push(actual);
  const usadas = lineas.join(" ").split(/\s+/).length;
  if (usadas < palabras.length && lineas.length > 0) {
    lineas[lineas.length - 1] = lineas[lineas.length - 1] + "…";
  }
  return lineas;
}

export function FlujogramasVista({
  nodos, aristas, dataObjects, puestos, gaps, esAdminSgi = false, procesosSgi = [], procesoInicial = null, documentos = [],
}: {
  nodos: NodoFlujo[];
  aristas: AristaFlujo[];
  dataObjects: DataObject[];
  puestos: PuestoRef[];
  gaps: GapSubproceso[];
  esAdminSgi?: boolean;
  procesosSgi?: { id: string; nombre: string; tipo?: string; ordenVis?: number }[];
  procesoInicial?: string | null;
  documentos?: { id: string; codigo: string; titulo: string }[];
}) {
  const [sel, setSel] = useState<Sel>(() => {
    if (procesoInicial) {
      const primero = nodos.find((n) => n.nivel === "proceso" && n.procesoId === procesoInicial);
      if (primero) return { nivel: 1, procId: primero.id, subId: null, pasoId: null };
    }
    return { nivel: 0, procId: null, subId: null, pasoId: null };
  });
  const [abierto, setAbierto] = useState<Record<string, boolean>>({});
  const [modalSubId, setModalSubId] = useState<string | null>(null);
  const [arbolAbierto, setArbolAbierto] = useState(false); // panel de árbol en mobile

  const porId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const procesos = useMemo(() => nodos.filter((n) => n.nivel === "proceso").sort((a, b) => a.orden - b.orden), [nodos]);
  const subsDe = useMemo(() => {
    const m = new Map<string, NodoFlujo[]>();
    nodos.filter((n) => n.nivel === "subproceso").forEach((s) => {
      if (!s.padreId) return;
      (m.get(s.padreId) ?? m.set(s.padreId, []).get(s.padreId)!).push(s);
    });
    return m;
  }, [nodos]);
  const pasosDe = useMemo(() => {
    const m = new Map<string, NodoFlujo[]>();
    nodos.filter((n) => n.nivel === "paso").forEach((p) => {
      if (!p.padreId) return;
      (m.get(p.padreId) ?? m.set(p.padreId, []).get(p.padreId)!).push(p);
    });
    for (const arr of m.values()) arr.sort((a, b) => a.orden - b.orden);
    return m;
  }, [nodos]);

  const gapDeSub = useMemo(() => new Map(gaps.map((g) => [g.subprocesoId, g])), [gaps]);
  const estadoDeProc = useMemo(() => {
    const m = new Map<string, EstadoGap>();
    for (const p of procesos) {
      const subs = subsDe.get(p.id) ?? [];
      m.set(p.id, agregarEstado(subs.map((s) => gapDeSub.get(s.id)?.estado ?? "sindatos")));
    }
    return m;
  }, [procesos, subsDe, gapDeSub]);

  const puestoNombre = useMemo(() => new Map(puestos.map((p) => [p.id, p.nombre])), [puestos]);

  // Árbol de 4 niveles: agrupar procesos-flujograma bajo su proceso del SGI (procesoId)
  const procSgiInfo = useMemo(() => new Map(procesosSgi.map((p) => [p.id, p])), [procesosSgi]);
  const tipoDeProceso = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of procesos) {
      const info = p.procesoId ? procSgiInfo.get(p.procesoId) : undefined;
      m.set(p.id, info?.tipo ?? "sin_tipo");
    }
    return m;
  }, [procesos, procSgiInfo]);

  // Orden del proceso SGI (cadena de valor) para cada flujograma
  const ordenDeProceso = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of procesos) {
      const info = p.procesoId ? procSgiInfo.get(p.procesoId) : undefined;
      m.set(p.id, info?.ordenVis ?? 999);
    }
    return m;
  }, [procesos, procSgiInfo]);

  // Elementos sueltos (sin conexiones) para el panel de acceso rápido
  const sueltos = useMemo(() => {
    const rotos = detectarSecuenciaRota(nodos, aristas);
    const out: { nodoId: string; titulo: string; proceso: string; subproceso: string; subId: string; procId: string }[] = [];
    for (const r of rotos) {
      for (const p of r.problemas) {
        if (p.tipo !== "suelto") continue;
        const nodo = porId.get(p.nodoId);
        const sub = nodo?.padreId ? porId.get(nodo.padreId) : undefined;
        const proc = sub?.padreId ? porId.get(sub.padreId) : undefined;
        out.push({ nodoId: p.nodoId, titulo: p.titulo, proceso: r.proceso, subproceso: r.subproceso, subId: sub?.id ?? "", procId: proc?.id ?? "" });
      }
    }
    return out;
  }, [nodos, aristas, porId]);

  // Nivel raíz agrupado por proceso SGI, y estos a su vez por TIPO (estratégico/operativo/apoyo)
  const gruposSgi = useMemo(() => {
    const m = new Map<string, { nombre: string; tipo: string; ordenVis?: number; procesos: NodoFlujo[] }>();
    for (const p of procesos) {
      const key = p.procesoId ?? "__sin__";
      const info = p.procesoId ? procSgiInfo.get(p.procesoId) : undefined;
      const nombre = info?.nombre ?? (p.procesoId ? "Proceso SGI" : "Sin vincular al SGI");
      const tipo = info?.tipo ?? "sin_tipo";
      const ordenVis = info?.ordenVis;
      if (!m.has(key)) m.set(key, { nombre, tipo, ordenVis, procesos: [] });
      m.get(key)!.procesos.push(p);
    }
    // Orden del mapa de procesos (cadena de valor), no alfabético.
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => {
        const oa = a.ordenVis ?? 999, ob = b.ordenVis ?? 999;
        if (oa !== ob) return oa - ob;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [procesos, procSgiInfo]);

  const TIPO_ORDEN: Record<string, number> = { estrategico: 0, operativo: 1, apoyo: 2, sin_tipo: 3 };
  const TIPO_LABEL: Record<string, string> = {
    estrategico: "Procesos estratégicos", operativo: "Procesos principales",
    apoyo: "Procesos de apoyo", sin_tipo: "Sin clasificar",
  };
  const seccionesPorTipo = useMemo(() => {
    const m = new Map<string, typeof gruposSgi>();
    for (const g of gruposSgi) {
      if (!m.has(g.tipo)) m.set(g.tipo, []);
      m.get(g.tipo)!.push(g);
    }
    return Array.from(m.entries()).sort((a, b) => (TIPO_ORDEN[a[0]] ?? 9) - (TIPO_ORDEN[b[0]] ?? 9));
  }, [gruposSgi]);

  const crumbs = useMemo(() => {
    const c: { label: string; go: Sel }[] = [{ label: "Procesos", go: { nivel: 0, procId: null, subId: null, pasoId: null } }];
    if (sel.procId) c.push({ label: porId.get(sel.procId)?.titulo ?? "", go: { nivel: 1, procId: sel.procId, subId: null, pasoId: null } });
    if (sel.subId) c.push({ label: porId.get(sel.subId)?.titulo ?? "", go: { nivel: 2, procId: sel.procId, subId: sel.subId, pasoId: null } });
    if (sel.pasoId) c.push({ label: porId.get(sel.pasoId)?.codigo ?? "paso", go: sel });
    return c;
  }, [sel, porId]);

  return (
    <div className="relative flex min-h-[70vh] gap-0 rounded-xl border border-border overflow-hidden bg-card">
      {/* Botón para abrir el árbol en mobile */}
      <button
        onClick={() => setArbolAbierto(true)}
        className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm shadow-sm md:hidden"
      >
        ☰ Procesos
      </button>
      {/* Backdrop cuando el árbol está abierto en mobile */}
      {arbolAbierto && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setArbolAbierto(false)} />
      )}
      {/* Árbol lateral · 4 niveles: proceso SGI › flujograma › subproceso › paso.
          En mobile: panel deslizable (oculto por defecto). En desktop: fijo. */}
      <aside className={`${arbolAbierto ? "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col bg-card shadow-2xl" : "hidden"} shrink-0 border-r border-border p-3 overflow-auto md:relative md:z-auto md:flex md:max-h-[80vh] md:w-64 md:flex-col md:bg-muted/30 md:shadow-none`}>
        {arbolAbierto && (
          <button onClick={() => setArbolAbierto(false)} className="mb-2 self-end rounded-md border border-border px-2 py-1 text-xs md:hidden">Cerrar ✕</button>
        )}
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mapa de procesos</p>
        {seccionesPorTipo.map(([tipo, grupos]) => (
          <div key={tipo} className="mb-3">
            <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{TIPO_LABEL[tipo] ?? tipo}</p>
            {grupos.map((g) => {
          const estados = g.procesos.map((p) => estadoDeProc.get(p.id) ?? "sindatos");
          const estG = agregarEstado(estados);
          const openG = abierto["sgi:" + g.id] ?? true;
          return (
            <div key={g.id} className="mb-1">
              <button
                onClick={() => setAbierto((o) => ({ ...o, ["sgi:" + g.id]: !(o["sgi:" + g.id] ?? true) }))}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold hover:bg-muted"
              >
                <span className="w-3 text-muted-foreground">{openG ? "▾" : "▸"}</span>
                <span className="text-[11px]">{PUNTO[estG]}</span>
                <span className="flex-1 truncate">{g.nombre}</span>
              </button>
              {openG && g.procesos.map((p) => {
                const subs = subsDe.get(p.id) ?? [];
                const est = estadoDeProc.get(p.id) ?? "sindatos";
                const open = abierto[p.id];
                return (
                  <div key={p.id} className="ml-2">
                    <button
                      onClick={() => { setAbierto((o) => ({ ...o, [p.id]: !o[p.id] })); setSel({ nivel: 1, procId: p.id, subId: null, pasoId: null }); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${sel.procId === p.id && !sel.subId ? "bg-muted" : ""}`}
                    >
                      <span className="w-3 text-muted-foreground">{subs.length ? (open ? "▾" : "▸") : "·"}</span>
                      <span className="text-[11px]">{PUNTO[est]}</span>
                      <span className="flex-1 truncate">{p.titulo}</span>
                    </button>
                    {open && subs.map((s) => {
                      const est2 = gapDeSub.get(s.id)?.estado ?? "sindatos";
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setSel({ nivel: 2, procId: p.id, subId: s.id, pasoId: null }); setArbolAbierto(false); }}
                          className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-9 pr-2 text-left text-[13px] hover:bg-muted ${sel.subId === s.id ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                        >
                          <span className="text-[10px]">{PUNTO[est2]}</span>
                          <span className="flex-1 truncate">{s.titulo}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Lienzo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <button
                onClick={() => setSel(c.go)}
                className={`text-sm ${i === crumbs.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {sel.nivel === 0 && (
            <>
              <NivelProcesos
                procesos={procesos} subsDe={subsDe} gapDeSub={gapDeSub} estadoDeProc={estadoDeProc}
                tipoDeProceso={tipoDeProceso}
                ordenDeProceso={ordenDeProceso}
                onPick={(id) => setSel({ nivel: 1, procId: id, subId: null, pasoId: null })}
              />
              {esAdminSgi && <div className="mt-6"><CrearProceso procesosSgi={procesosSgi} /></div>}
              {esAdminSgi && sueltos.length > 0 && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-700">{sueltos.length} elemento{sueltos.length !== 1 ? "s" : ""} sin conectar</p>
                  <p className="mb-3 text-xs text-muted-foreground">Estos pasos no tienen ninguna conexión. Entrá a cada uno para conectarlo en la secuencia.</p>
                  <div className="space-y-1">
                    {sueltos.map((s) => (
                      <div key={s.nodoId} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{s.proceso} · {s.subproceso} ·</span>
                        <span className="font-medium">{s.titulo}</span>
                        <button
                          onClick={() => setSel({ nivel: 3, procId: s.procId, subId: s.subId, pasoId: s.nodoId })}
                          className="rounded-md border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                        >
                          Ir a conectar →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {sel.nivel === 1 && sel.procId && (
            <>
              <NivelSubprocesos
                proc={porId.get(sel.procId)!} subs={subsDe.get(sel.procId) ?? []} gapDeSub={gapDeSub}
                onPick={(id) => setSel({ nivel: 2, procId: sel.procId, subId: id, pasoId: null })}
              />
              <PanelCoberturaErp procesoId={porId.get(sel.procId)!.procesoId ?? null} />
              <PanelVersionado procesoFlujoId={sel.procId} />
              {esAdminSgi && <EditorProceso nodo={porId.get(sel.procId)!} procesos={procesosSgi} />}
              {esAdminSgi && (
                <>
                  <CrearSubproceso procesoFlujogramaId={sel.procId} />
                  <SubprocesoParaImportar procId={sel.procId} subs={subsDe.get(sel.procId) ?? []} />
                </>
              )}
            </>
          )}
          {sel.nivel === 2 && sel.subId && (
            <>
              <NivelSwimlane
                sub={porId.get(sel.subId)!} pasos={pasosDe.get(sel.subId) ?? []} aristas={aristas}
                puestoNombre={puestoNombre}
                onPaso={(id) => setSel({ ...sel, nivel: 3, pasoId: id })}
                onExpandir={() => setModalSubId(sel.subId)}
              />
              {esAdminSgi && (
                <EditorSubproceso
                  subprocesoId={sel.subId}
                  puestos={puestos}
                  flujogramas={procesos.map((p) => ({ id: p.id, titulo: p.titulo }))}
                  padreId={porId.get(sel.subId)?.padreId ?? null}
                />
              )}
            </>
          )}
          {sel.nivel === 3 && sel.pasoId && (
            <>
              <FichaPaso
                paso={porId.get(sel.pasoId)!} dataObjects={dataObjects.filter((d) => d.nodoId === sel.pasoId)}
                puestoNombre={puestoNombre}
                onClose={() => setSel({ ...sel, nivel: 2, pasoId: null })}
              />
              {esAdminSgi && (
                <EditorPaso
                  paso={porId.get(sel.pasoId)!}
                  puestos={puestos}
                  pasosHermanos={(pasosDe.get(porId.get(sel.pasoId)!.padreId ?? "") ?? [])}
                  aristasSalientes={aristas.filter((a) => a.origenId === sel.pasoId)}
                  aristasEntrantes={aristas.filter((a) => a.destinoId === sel.pasoId)}
                  dataObjects={dataObjects.filter((d) => d.nodoId === sel.pasoId)}
                  documentos={documentos}
                  procesoIdSgi={(() => {
                    const p = porId.get(sel.pasoId!);
                    const sub = p?.padreId ? porId.get(p.padreId) : undefined;
                    const procFlujo = sub?.padreId ? porId.get(sub.padreId) : undefined;
                    return procFlujo?.procesoId ?? null;
                  })()}
                />
              )}
            </>
          )}
        </div>
      </div>
      {modalSubId && (
        <ModalFlujograma
          titulo={porId.get(modalSubId)?.titulo ?? "Flujograma"}
          pasos={pasosDe.get(modalSubId) ?? []}
          aristas={aristas}
          puestoNombre={puestoNombre}
          onPaso={(id) => { setSel({ nivel: 3, procId: sel.procId, subId: modalSubId, pasoId: id }); setModalSubId(null); }}
          onClose={() => setModalSubId(null)}
        />
      )}
    </div>
  );
}

// ── Nivel 0 ──
function NivelProcesos({ procesos, subsDe, gapDeSub, estadoDeProc, tipoDeProceso, ordenDeProceso, onPick }: {
  procesos: NodoFlujo[];
  subsDe: Map<string, NodoFlujo[]>;
  gapDeSub: Map<string, GapSubproceso>;
  estadoDeProc: Map<string, EstadoGap>;
  tipoDeProceso: Map<string, string>;
  ordenDeProceso: Map<string, number>;
  onPick: (id: string) => void;
}) {
  const TIPO_ORDEN: Record<string, number> = { estrategico: 0, operativo: 1, apoyo: 2, sin_tipo: 3 };
  const TIPO_LABEL: Record<string, string> = {
    estrategico: "Procesos estratégicos", operativo: "Procesos principales",
    apoyo: "Procesos de apoyo", sin_tipo: "Sin clasificar",
  };
  const secciones = (() => {
    const m = new Map<string, NodoFlujo[]>();
    for (const p of procesos) {
      const t = tipoDeProceso.get(p.id) ?? "sin_tipo";
      if (!m.has(t)) m.set(t, []);
      m.get(t)!.push(p);
    }
    // Dentro de cada tipo, ordenar por la secuencia del mapa de procesos (cadena de valor)
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const oa = ordenDeProceso.get(a.id) ?? 999, ob = ordenDeProceso.get(b.id) ?? 999;
        if (oa !== ob) return oa - ob;
        return a.titulo.localeCompare(b.titulo);
      });
    }
    return Array.from(m.entries()).sort((a, b) => (TIPO_ORDEN[a[0]] ?? 9) - (TIPO_ORDEN[b[0]] ?? 9));
  })();

  const Tarjeta = ({ p }: { p: NodoFlujo }) => {
    const subs = subsDe.get(p.id) ?? [];
    const est = estadoDeProc.get(p.id) ?? "sindatos";
    const nRojo = subs.filter((s) => gapDeSub.get(s.id)?.estado === "rojo").length;
    return (
      <button
        onClick={() => onPick(p.id)}
        className="rounded-xl border border-border bg-background p-4 text-left transition hover:shadow-md"
        style={{ borderLeftWidth: 4, borderLeftColor: COLOR[est] }}
      >
        <div className="flex items-start justify-between">
          <span className="font-medium">{p.titulo}</span>
          <span>{PUNTO[est]}</span>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {subs.length} subproceso{subs.length !== 1 ? "s" : ""}
          {nRojo > 0 && <span className="font-semibold text-red-600"> · {nRojo} con riesgo sin control</span>}
        </div>
      </button>
    );
  };

  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">Mapa de procesos</h2>
      <p className="mb-5 text-sm text-muted-foreground">Agrupados por tipo, con la clasificación del mapa general. El color agrega el estado de cumplimiento. Clic para entrar.</p>
      {secciones.map(([tipo, procs]) => (
        <div key={tipo} className="mb-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{TIPO_LABEL[tipo] ?? tipo}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
            {procs.map((p) => <Tarjeta key={p.id} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Nivel 1 ──
function NivelSubprocesos({ proc, subs, gapDeSub, onPick }: {
  proc: NodoFlujo; subs: NodoFlujo[]; gapDeSub: Map<string, GapSubproceso>; onPick: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">{proc.titulo}</h2>
      <p className="mb-5 text-sm text-muted-foreground">Subprocesos (etapas). Clic para ver el flujograma detallado.</p>
      <div className="flex flex-wrap items-stretch gap-3">
        {subs.map((s) => {
          const g = gapDeSub.get(s.id);
          const est = g?.estado ?? "sindatos";
          return (
            <button
              key={s.id} onClick={() => onPick(s.id)}
              className="min-w-[200px] max-w-[240px] rounded-xl border border-border bg-background p-4 text-left transition hover:shadow-md"
              style={{ borderTopWidth: 4, borderTopColor: COLOR[est] }}
            >
              <div className="mb-3 font-medium">{s.titulo}</div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>⚠ {g?.riesgos ?? 0} riesgos</span>
                <span>✓ {g?.controles ?? 0} ctrl</span>
              </div>
              <div className="mt-2 text-[11px] font-semibold" style={{ color: COLOR[est] }}>
                {PUNTO[est]} {g?.etiqueta ?? "Sin datos"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Nivel 2: swimlane BPMN ──
function NivelSwimlane({ sub, pasos, aristas, puestoNombre, onPaso, onExpandir }: {
  sub: NodoFlujo; pasos: NodoFlujo[]; aristas: AristaFlujo[];
  puestoNombre: Map<string, string>; onPaso: (id: string) => void; onExpandir?: () => void;
}) {
  // Fit-to-width (hooks al inicio, antes de cualquier return condicional)
  const contRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const COL_W0 = 210, HEAD0 = 160;
  const anchoTotal = HEAD0 + pasos.length * COL_W0 + 20;
  useEffect(() => {
    const medir = () => {
      if (!contRef.current) return;
      const disp = contRef.current.clientWidth - 4;
      setEscala(anchoTotal > disp ? Math.max(0.35, disp / anchoTotal) : 1);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [anchoTotal]);
  if (pasos.length === 0) {
    return (
      <div>
        <h2 className="mb-1 font-serif text-2xl font-semibold">{sub.titulo}</h2>
        <p className="text-sm text-muted-foreground">Este subproceso no tiene pasos cargados.</p>
      </div>
    );
  }
  const idx = new Map(pasos.map((p, i) => [p.id, i]));
  const lanes = Array.from(new Set(pasos.map((p) => p.puestoId ?? "—")));
  const LANE_H = 116, COL_W = 210, NODE_W = 150, NODE_H = 58, HEAD = 160, TOP = 20;
  const posX = (i: number) => HEAD + i * COL_W + (COL_W - NODE_W) / 2;
  const laneY = (lane: string) => TOP + lanes.indexOf(lane) * LANE_H + (LANE_H - NODE_H) / 2;
  const W = HEAD + pasos.length * COL_W + 20;
  const H = lanes.length * LANE_H + TOP + 12;
  const salidas = (id: string) => aristas.filter((a) => a.origenId === id);
  const canales = asignarCanales(aristas);
  const posNodo = (id: string) => {
    const n = pasos.find((pp) => pp.id === id);
    if (!n) return null;
    const i = idx.get(id); if (i === undefined) return null;
    return { cx: posX(i) + NODE_W / 2, cy: laneY(n.puestoId ?? "—") + NODE_H / 2 };
  };
  const lados = asignarLados(pasos, aristas, posNodo);
  const conConexion = new Set<string>();
  for (const a of aristas) { conConexion.add(a.origenId); conConexion.add(a.destinoId); }
  const estaSuelto = (id: string) => !conConexion.has(id);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-semibold">{sub.titulo}</h2>
        {onExpandir && (
          <button onClick={onExpandir} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            ⛶ Pantalla completa
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Swimlane BPMN · carril = puesto responsable. Clic en un paso para su ficha.</p>
      <div ref={contRef} className="overflow-auto rounded-lg border border-border">
        <svg width={W * escala} height={H * escala} viewBox={`0 0 ${W} ${H}`} className="block">
          <defs>
            <marker id="fl-ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="#64748b" />
            </marker>
          </defs>
          {lanes.map((ln, i) => (
            <g key={ln}>
              <rect x={0} y={TOP + i * LANE_H} width={W} height={LANE_H} fill={i % 2 ? "#f8fafc" : "#f1f5f9"} />
              <rect x={0} y={TOP + i * LANE_H} width={HEAD} height={LANE_H} fill="#e2e8f0" />
              <text x={12} y={TOP + i * LANE_H + LANE_H / 2} fontSize={12} fontWeight={600} fill="#334155" dominantBaseline="middle">
                {(puestoNombre.get(ln) ?? "Sin asignar").slice(0, 22)}
              </text>
            </g>
          ))}
          {pasos.map((p) => salidas(p.id).map((a) => {
            const j = idx.get(a.destinoId);
            if (j === undefined) return null;
            const b = pasos[j];
            const iP = idx.get(p.id)!;
            const back = j <= iP;
            const ox = posX(iP), oy = laneY(p.puestoId ?? "—");
            const bx = posX(j), by = laneY(b.puestoId ?? "—");
            const lad = lados.get(a.id) ?? { ladoSal: "der" as const, ladoEnt: "izq" as const };
            const start = puntoEnLado(formaDeNodo(p.tipoBpmn), ox, oy, NODE_W, NODE_H, lad.ladoSal);
            const end = puntoEnLado(formaDeNodo(b.tipoBpmn), bx, by, NODE_W, NODE_H, lad.ladoEnt);
            const sx = start.px, sy = start.py, ex = end.px, ey = end.py;
            const clase = claseRama(a.etiqueta);
            const col = clase === "desvio" ? "#dc2626"
              : clase === "feliz" ? "#16a34a"
              : a.tipo === "rama" ? "#64748b" : "#94a3b8";
            const d = pathOrtogonal(sx, sy, lad.ladoSal, ex, ey, lad.ladoEnt, 22, canales.get(a.id) ?? 0);
            const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 6;
            return (
              <g key={a.id}>
                <path d={d} fill="none" stroke={col} strokeWidth={1.8} markerEnd="url(#fl-ar)" strokeDasharray={back ? "4 3" : "0"} />
                {a.etiqueta && (
                  <g>
                    <rect x={mx - a.etiqueta.length * 3.2 - 4} y={my - 10} width={a.etiqueta.length * 6.4 + 8} height={15} rx={3} fill="#ffffff" stroke={col} strokeWidth={0.8} opacity={0.95} />
                    <text x={mx} y={my} fontSize={10} fontWeight={700} fill={col} textAnchor="middle">{a.etiqueta}</text>
                  </g>
                )}
              </g>
            );
          }))}
          {pasos.map((p) => {
            const x = posX(idx.get(p.id)!), y = laneY(p.puestoId ?? "—");
            const dec = p.tipoBpmn === "decision";
            const ev = p.tipoBpmn === "inicio" || p.tipoBpmn === "fin";
            const esInicio = p.tipoBpmn === "inicio";
            const esFin = p.tipoBpmn === "fin";
            const fill = dec ? "#fef3c7" : esInicio ? "#dcfce7" : esFin ? "#fee2e2" : "#dcfce7";
            const stroke = dec ? "#d97706" : esInicio ? "#16a34a" : esFin ? "#dc2626" : "#16a34a";
            const gapMark = p.codRiesgo && p.tipoBpmn !== "decision";
            const suelto = estaSuelto(p.id);
            return (
              <g key={p.id} className="cursor-pointer" onClick={() => onPaso(p.id)}>
                {suelto && (
                  <rect x={x - 5} y={y - 5} width={NODE_W + 10} height={NODE_H + 10} rx={12} fill="none" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 3" />
                )}
                {dec ? (
                  <polygon points={`${x + NODE_W / 2},${y} ${x + NODE_W},${y + NODE_H / 2} ${x + NODE_W / 2},${y + NODE_H} ${x},${y + NODE_H / 2}`} fill={fill} stroke={stroke} strokeWidth={1.6} />
                ) : ev ? (
                  <circle cx={x + NODE_W / 2} cy={y + NODE_H / 2} r={NODE_H / 2 - 2} fill={fill} stroke={stroke} strokeWidth={p.tipoBpmn === "fin" ? 3 : 1.6} />
                ) : (
                  <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={9} fill={fill} stroke={stroke} strokeWidth={1.6} />
                )}
                {(() => {
                  const t = p.titulo ?? "";
                  const entra = !ev && t.length <= 18;
                  if (entra) {
                    return <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 4} fontSize={11} fontWeight={600} fill="#1e293b" textAnchor="middle">{t}</text>;
                  }
                  const lineas = envolverTexto(t, 26, 2);
                  return (
                    <text x={x + NODE_W / 2} y={y + NODE_H + 12} fontSize={10} fontWeight={600} fill="#475569" textAnchor="middle">
                      {lineas.map((ln, k) => <tspan key={k} x={x + NODE_W / 2} dy={k === 0 ? 0 : 11}>{ln}</tspan>)}
                    </text>
                  );
                })()}
                {gapMark && !ev && <text x={x + NODE_W - 12} y={y + 14} fontSize={13}>⚠</text>}
                {suelto && (
                  <text x={x + NODE_W / 2} y={y - 10} fontSize={9} fontWeight={700} fill="#dc2626" textAnchor="middle">sin conectar</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ⚠ marca pasos que declaran riesgo sin ser control. La secuencia proviene del orden del relevamiento; corregila donde no refleje el flujo real.
      </p>
    </div>
  );
}

// ── Nivel 3: ficha ──
function FichaPaso({ paso, dataObjects, puestoNombre, onClose }: {
  paso: NodoFlujo; dataObjects: DataObject[]; puestoNombre: Map<string, string>; onClose: () => void;
}) {
  const entradas = dataObjects.filter((d) => d.direccion === "entrada");
  const salidas = dataObjects.filter((d) => d.direccion === "salida");
  const gap = paso.codRiesgo && paso.tipoBpmn !== "decision";
  const Row = ({ k, v, danger }: { k: string; v: string; danger?: boolean }) => (
    <div className="flex border-b border-border py-2.5">
      <span className="w-40 text-sm text-muted-foreground">{k}</span>
      <span className={`flex-1 text-sm ${danger ? "font-medium text-red-600" : ""}`}>{v}</span>
    </div>
  );
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold">{paso.titulo}</h2>
        <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">← volver al flujo</button>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <Row k="Código" v={paso.codigo ?? "—"} />
        <Row k="Responsable (carril)" v={paso.puestoId ? (puestoNombre.get(paso.puestoId) ?? "—") : "—"} />
        <Row k="Tipo BPMN" v={paso.tipoBpmn ?? "—"} />
        <Row k="Documentos entrada" v={entradas.length ? entradas.map((d) => d.etiqueta).join(" · ") : "—"} />
        <Row k="Documentos salida" v={salidas.length ? salidas.map((d) => d.etiqueta).join(" · ") : "—"} />
        <Row k="Riesgo declarado" v={paso.codRiesgo ?? "— ninguno —"} />
        <Row k="Normativa" v={paso.normativa ?? "—"} />
        {gap && <Row k="⚠ Gap detectado" v="Declara riesgo pero no es un control. Candidato a NC (2ª etapa)." danger />}
        {(() => {
          const av = evaluarEstiloNodo(paso);
          if (!av) return null;
          return (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
              <span className="font-medium text-amber-800">✎ Estilo BPMN:</span>{" "}
              <span className="text-amber-700">{av.regla}</span>
              {av.sugerencia && (
                <div className="mt-1 text-amber-700">Sugerencia: <span className="font-medium">“{av.sugerencia}”</span></div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


// Selector de subproceso destino para importar un Excel
function SubprocesoParaImportar({ procId, subs }: { procId: string; subs: NodoFlujo[] }) {
  const [subSel, setSubSel] = useState("");
  void procId;
  if (subs.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Para importar un Excel, primero creá un subproceso arriba.
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Importar Excel al subproceso:</span>
        <select value={subSel} onChange={(e) => setSubSel(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
          <option value="">— elegir subproceso —</option>
          {subs.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}
        </select>
      </div>
      {subSel && <ImportarExcel subprocesoId={subSel} />}
    </div>
  );
}
