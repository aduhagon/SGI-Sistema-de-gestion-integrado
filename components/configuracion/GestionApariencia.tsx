"use client";

import { useState, useTransition } from "react";
import {
  TEMA_DEFAULT,
  TOKENS_META,
  tokensACssVars,
  hslStrToHex,
  hexToHslStr,
  type TemaTokens,
} from "@/lib/tema/default";
import type { TemaVisual } from "@/lib/api/temas";
import {
  crearTema,
  actualizarTema,
  duplicarTema,
  renombrarTema,
  eliminarTema,
  aplicarTema,
} from "@/app/(app)/configuracion/apariencia/actions";

type Props = {
  temas: TemaVisual[];
  activoIdInicial: string;
};

const clone = (t: TemaTokens): TemaTokens => ({ ...t });
const GRUPOS = ["Marca", "Superficies", "Detalles", "Barra superior", "Forma"] as const;

export default function GestionApariencia({ temas: temasIniciales, activoIdInicial }: Props) {
  const [temas, setTemas] = useState<TemaVisual[]>(temasIniciales);
  const [activoId, setActivoId] = useState(activoIdInicial);
  const [editId, setEditId] = useState("default");
  const [draft, setDraft] = useState<TemaTokens>(
    clone(temasIniciales.find((t) => t.id === "default")?.tokens ?? TEMA_DEFAULT),
  );
  const [pending, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  const run = (fn: () => Promise<void>) => startTransition(() => { void fn(); });

  const editingTheme = () => temas.find((t) => t.id === editId)!;
  const isLocked = () => editingTheme()?.sistema ?? false;
  const isDirty = () =>
    JSON.stringify(draft) !== JSON.stringify(editingTheme()?.tokens ?? TEMA_DEFAULT);

  function flash(tipo: "ok" | "err", msg: string) {
    setAviso({ tipo, msg });
    setTimeout(() => setAviso(null), 2600);
  }

  function openTheme(id: string) {
    if (isDirty() && !confirm(`Tenés cambios sin guardar en "${editingTheme().nombre}". ¿Descartarlos?`))
      return;
    const t = temas.find((x) => x.id === id);
    if (!t) return;
    setEditId(id);
    setDraft(clone(t.tokens));
  }

  /** Si el tema en edición es Default, crear una copia editable antes de tocar. */
  function ensureEditable(): boolean {
    if (!isLocked()) return true;
    if (!confirm("Default es de solo lectura. ¿Crear una copia editable para aplicar tus cambios?"))
      return false;
    const fd = new FormData();
    fd.set("nombre", "Default (copia)");
    fd.set("tokens", JSON.stringify(draft));
    run(async () => {
      const r = await crearTema(null, fd);
      if (r?.ok && r.id) {
        const nuevo: TemaVisual = { id: r.id, nombre: "Default (copia)", sistema: false, tokens: clone(draft) };
        setTemas((prev) => [...prev, nuevo]);
        setEditId(r.id);
        flash("ok", "Copia creada. Ahora podés editarla.");
      } else if (r && !r.ok) flash("err", r.error);
    });
    return false;
  }

  function setToken(key: keyof TemaTokens, value: string) {
    if (!ensureEditable()) return;
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setColorFromHex(key: keyof TemaTokens, hex: string) {
    setToken(key, hexToHslStr(hex));
  }

  function nuevoTema() {
    const base = temas.find((t) => t.id === activoId) ?? editingTheme();
    const fd = new FormData();
    fd.set("nombre", "Tema nuevo");
    fd.set("tokens", JSON.stringify(base.tokens));
    run(async () => {
      const r = await crearTema(null, fd);
      if (r?.ok && r.id) {
        const nuevo: TemaVisual = { id: r.id, nombre: "Tema nuevo", sistema: false, tokens: clone(base.tokens) };
        setTemas((prev) => [...prev, nuevo]);
        setEditId(r.id);
        setDraft(clone(base.tokens));
        flash("ok", "Tema creado.");
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  function guardar() {
    if (isLocked()) return;
    const fd = new FormData();
    fd.set("id", editId);
    fd.set("nombre", editingTheme().nombre);
    fd.set("tokens", JSON.stringify(draft));
    run(async () => {
      const r = await actualizarTema(null, fd);
      if (r?.ok) {
        setTemas((prev) => prev.map((t) => (t.id === editId ? { ...t, tokens: clone(draft) } : t)));
        flash("ok", `"${editingTheme().nombre}" guardado.`);
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  function descartar() {
    setDraft(clone(editingTheme().tokens));
  }

  function restablecerDefault() {
    if (isLocked()) return;
    if (!confirm("Esto reemplaza todos los colores y la forma de este tema por los de fábrica. ¿Continuar?"))
      return;
    setDraft(clone(TEMA_DEFAULT));
  }

  function aplicar(id: string) {
    run(async () => {
      const r = await aplicarTema(id);
      if (r?.ok) {
        setActivoId(id);
        flash("ok", `"${temas.find((t) => t.id === id)?.nombre}" aplicado a todo el SGI.`);
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  function duplicar(t: TemaVisual) {
    run(async () => {
      const r = await duplicarTema(t.id, t.nombre);
      if (r?.ok && r.id) {
        const nuevo: TemaVisual = { id: r.id, nombre: `${t.nombre} (copia)`.slice(0, 60), sistema: false, tokens: clone(t.tokens) };
        setTemas((prev) => [...prev, nuevo]);
        flash("ok", "Tema duplicado.");
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  function renombrar(t: TemaVisual) {
    const n = prompt("Nuevo nombre:", t.nombre);
    if (!n || !n.trim()) return;
    run(async () => {
      const r = await renombrarTema(t.id, n.trim());
      if (r?.ok) {
        setTemas((prev) => prev.map((x) => (x.id === t.id ? { ...x, nombre: n.trim() } : x)));
        flash("ok", "Tema renombrado.");
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  function eliminar(t: TemaVisual) {
    if (t.id === activoId) { flash("err", "No podés eliminar el tema activo."); return; }
    if (!confirm(`¿Eliminar "${t.nombre}"?`)) return;
    run(async () => {
      const r = await eliminarTema(t.id);
      if (r?.ok) {
        setTemas((prev) => prev.filter((x) => x.id !== t.id));
        if (editId === t.id) openTheme("default");
        flash("ok", "Tema eliminado.");
      } else if (r && !r.ok) flash("err", r.error);
    });
  }

  // estilos del preview: scope local con las vars del draft. Dentro usamos
  // clases shadcn reales (bg-primary, etc.), que leen estas vars.
  const previewVars = tokensACssVars(draft) as React.CSSProperties;
  const locked = isLocked();
  const dirty = isDirty();

  return (
    <div>
      {/* ===== barra de temas ===== */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">Temas</span>
          <span className="text-xs text-muted-foreground">
            Activo en el SGI: {temas.find((t) => t.id === activoId)?.nombre ?? "Default"}
          </span>
        </div>
        <div className="flex gap-3 flex-wrap items-stretch">
          {temas.map((t) => {
            const isActive = t.id === activoId;
            const isEditing = t.id === editId;
            return (
              <div
                key={t.id}
                onClick={() => openTheme(t.id)}
                className={`relative min-w-[168px] rounded-xl border bg-card px-3.5 py-3 cursor-pointer transition ${
                  isEditing ? "border-accent ring-1 ring-accent" : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[13px] font-bold truncate text-foreground">{t.nombre}</span>
                </div>
                <div className="flex gap-1 mb-2">
                  {(["primary", "accent", "background", "muted"] as const).map((k) => (
                    <span key={k} className="w-5 h-5 rounded-[5px] border border-black/10" style={{ background: `hsl(${t.tokens[k]})` }} />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {isActive ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold uppercase text-[9.5px] tracking-wide">Activo</span>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); aplicar(t.id); }} className="text-primary font-semibold hover:underline">Aplicar</button>
                  )}
                  {t.sistema && (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase text-[9.5px] tracking-wide">De fábrica</span>
                  )}
                </div>
                {!t.sistema && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border text-[11px]">
                    <button onClick={(e) => { e.stopPropagation(); renombrar(t); }} className="text-muted-foreground hover:text-foreground">Renombrar</button>
                    <button onClick={(e) => { e.stopPropagation(); duplicar(t); }} className="text-muted-foreground hover:text-foreground">Duplicar</button>
                    <button onClick={(e) => { e.stopPropagation(); eliminar(t); }} disabled={isActive} className="text-destructive hover:opacity-80 disabled:opacity-30 ml-auto">Eliminar</button>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={nuevoTema} className="min-w-[120px] rounded-xl border-[1.5px] border-dashed border-border hover:border-accent text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-[12.5px] transition">
            <span className="text-2xl font-light leading-none">+</span>
            Nuevo tema
          </button>
        </div>
      </div>

      {/* ===== banner ===== */}
      <div className={`flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 mb-[18px] text-[13px] border ${locked ? "bg-muted border-border" : "bg-accent/10 border-accent/35"}`}>
        <span className={`w-2 h-2 rounded-full ${locked ? "bg-muted-foreground" : "bg-accent"}`} />
        <span className="text-foreground">
          {locked ? (
            <>Estás viendo <strong>{editingTheme().nombre}</strong> (de fábrica, solo lectura). Para editar, se creará una copia.</>
          ) : (
            <>Editando <strong>{editingTheme().nombre}</strong>. Los cambios no se aplican al SGI hasta guardar.</>
          )}
        </span>
        <span className="flex-1" />
        {!locked && (
          <button onClick={restablecerDefault} className="border border-border rounded-md px-3 py-1.5 text-xs font-semibold text-primary hover:bg-card">Restablecer a Default</button>
        )}
      </div>

      {/* ===== grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-7 items-start">
        {/* editor */}
        <div className={`bg-card border border-border rounded-2xl overflow-hidden ${locked ? "opacity-60 pointer-events-none" : ""}`}>
          {GRUPOS.map((grupo, gi) => {
            const items = TOKENS_META.filter((m) => m.grupo === grupo);
            return (
              <section key={grupo} className="p-5 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="font-mono text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {String(gi + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-bold text-foreground">{grupo}</span>
                </div>
                <div className="mt-3">
                  {items.map((m) => (
                    <div key={m.key} className="flex items-center gap-3.5 py-2 border-b border-dashed border-border last:border-0">
                      {m.tipo === "color" ? (
                        <>
                          <label className="relative w-10 h-10 rounded-lg shrink-0 border border-black/10 overflow-hidden cursor-pointer" style={{ background: `hsl(${draft[m.key]})` }}>
                            <input
                              type="color"
                              value={hslStrToHex(draft[m.key] as string)}
                              onChange={(e) => setColorFromHex(m.key, e.target.value)}
                              className="absolute -inset-1 w-[130%] h-[130%] opacity-0 cursor-pointer"
                            />
                          </label>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-foreground">{m.nombre}</div>
                            <div className="text-[11.5px] text-muted-foreground">{m.uso}</div>
                          </div>
                          <input
                            key={`${m.key}-${draft[m.key]}`}
                            defaultValue={draft[m.key] as string}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (/^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/.test(v)) setToken(m.key, v);
                            }}
                            className="font-mono text-[12px] w-28 px-2 py-1.5 border border-input rounded-md bg-muted text-foreground focus:outline-2 focus:outline-ring"
                            title="Formato HSL: H S% L%"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-foreground">{m.nombre}</div>
                            <div className="text-[11.5px] text-muted-foreground">{m.uso}</div>
                          </div>
                          <div className="flex items-center gap-3 w-1/2">
                            <input
                              type="range" min={0} max={16} step={1}
                              value={parseFloat(String(draft.radius))}
                              onChange={(e) => setToken("radius", `${e.target.value}px`)}
                              className="flex-1 accent-accent"
                            />
                            <span className="font-mono text-xs text-muted-foreground w-14 text-right">{draft.radius}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* preview — usa clases shadcn reales scopeadas con las vars del draft */}
        <div className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground font-semibold">Vista previa en vivo</span>
            <span className="text-[11px] text-muted-foreground">Componentes reales del SGI</span>
          </div>
          <div style={previewVars} className="rounded-2xl overflow-hidden border border-border shadow-lg">
            {/* top bar */}
            <div className="bg-primary text-primary-foreground px-[18px] py-[13px] flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-serif font-bold text-base">
                <span className="h-[30px] min-w-[30px] rounded-md flex items-center justify-center text-[13px] font-bold px-1.5 bg-card text-primary">MSU</span>
                <span>SGI</span>
              </div>
              <span className="w-[30px] h-[30px] rounded-full bg-accent" />
            </div>
            {/* cuerpo */}
            <div className="flex min-h-[340px] bg-background">
              <nav className="w-40 shrink-0 p-3.5 border-r border-border bg-card">
                {["Panorama", "Documental", "No Conformidades", "Riesgos", "Indicadores"].map((n, i) => (
                  <div key={n} className={`text-[12.5px] px-2.5 py-2 rounded-md mb-0.5 flex items-center gap-2 ${i === 0 ? "bg-accent/15 text-accent font-semibold" : "text-card-foreground"}`} style={{ borderRadius: "calc(var(--radius) - 2px)" }}>
                    <span className={`w-[7px] h-[7px] rounded-[2px] ${i === 0 ? "bg-accent" : "bg-muted-foreground/40"}`} />
                    {n}
                  </div>
                ))}
              </nav>
              <main className="flex-1 p-[18px]">
                <div className="text-lg font-serif font-bold tracking-tight text-foreground">Panorama de cumplimiento</div>
                <div className="text-[12.5px] text-muted-foreground mt-0.5 mb-4">ISO 9001 · 14001 · 45001 · BRCGS · BPA · GlobalG.A.P.</div>
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[["94%", "Cobertura"], ["7", "NC abiertas"], ["111", "Riesgos"]].map(([n, l]) => (
                    <div key={l} className="p-3 border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
                      <div className="font-serif font-bold text-xl text-primary">{n}</div>
                      <div className="text-[10.5px] text-muted-foreground uppercase tracking-wide">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent">Vigente</span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">En revisión</span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent">Aprobado</span>
                </div>
                <div className="flex items-center justify-between p-3 mb-2 border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
                  <div>
                    <div className="text-[13px] font-semibold text-card-foreground">PR-COM-001 · Compras</div>
                    <div className="text-[11px] text-muted-foreground">ISO 9001 — 8.4 · v3</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent">Vigente</span>
                </div>
                <div className="flex gap-2 mt-3.5">
                  <button className="text-[13px] font-semibold px-4 py-2 bg-primary text-primary-foreground" style={{ borderRadius: "var(--radius)" }}>Aprobar versión</button>
                  <button className="text-[13px] font-semibold px-3.5 py-2 border border-primary text-primary bg-transparent" style={{ borderRadius: "var(--radius)" }}>Ver historial</button>
                  <button className="text-[13px] font-semibold px-3.5 py-2 bg-destructive text-destructive-foreground ml-auto" style={{ borderRadius: "var(--radius)" }}>Eliminar</button>
                </div>
              </main>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Los colores de datos (semáforos de riesgo, mapas de calor) NO dependen del tema: mantienen su código rojo/ámbar/verde para no perder lectura.
          </p>
        </div>
      </div>

      {/* footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t border-border px-6 py-3 flex justify-end gap-2.5 items-center z-20">
        <span className="mr-auto text-[12.5px] text-muted-foreground">
          {dirty ? `Cambios sin guardar en "${editingTheme().nombre}".` : "Sin cambios pendientes."}
        </span>
        <button onClick={descartar} disabled={!dirty || pending} className="bg-card border border-border font-semibold text-[13.5px] px-[18px] py-2.5 rounded-lg text-foreground disabled:opacity-40">Descartar cambios</button>
        <button onClick={guardar} disabled={!dirty || locked || pending} className="bg-primary text-primary-foreground font-bold text-[13.5px] px-[22px] py-2.5 rounded-lg disabled:opacity-45">
          {pending ? "Guardando…" : "Guardar tema"}
        </button>
      </div>

      {aviso && (
        <div className={`fixed bottom-[74px] left-1/2 -translate-x-1/2 text-[13px] font-semibold px-5 py-2.5 rounded-[10px] z-30 ${aviso.tipo === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {aviso.msg}
        </div>
      )}
    </div>
  );
}
