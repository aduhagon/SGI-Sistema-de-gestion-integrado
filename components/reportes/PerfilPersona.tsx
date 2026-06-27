"use client";

import { useState, useTransition } from "react";
import { User, Briefcase, Loader2, Network, FileText } from "lucide-react";
import type { PersonaPerfil, PerfilRaci, FilaRaci } from "@/lib/api/perfil-persona";
import { cargarPerfilRaci } from "@/app/(app)/reportes/personas/actions";

const RACI_META: Record<FilaRaci["raci"], { bg: string; fg: string; label: string }> = {
  A: { bg: "#F5C4B3", fg: "#993C1D", label: "Aprueba" },
  R: { bg: "#9FE1CB", fg: "#0F6E56", label: "Ejecuta" },
  C: { bg: "#FAC775", fg: "#854F0B", label: "Consultado" },
  I: { bg: "#E6F1FB", fg: "#185FA5", label: "Informado" },
};

type Tab = "proceso" | "documento";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function PerfilPersona({ personas }: { personas: PersonaPerfil[] }) {
  const [selId, setSelId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilRaci | null>(null);
  const [tab, setTab] = useState<Tab>("proceso");
  const [pendiente, startTransition] = useTransition();

  const sel = personas.find((p) => p.personaId === selId) ?? null;

  function elegir(p: PersonaPerfil) {
    setSelId(p.personaId);
    setPerfil(null);
    setTab("proceso");
    startTransition(async () => {
      const r = await cargarPerfilRaci(p.personaId);
      setPerfil(r);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[300px_1fr]">
      {/* Panel maestro: lista de personas */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm font-medium">Personas</p>
          <p className="text-xs text-muted-foreground">{personas.length} en el padrón</p>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {personas.map((p) => {
            const activo = p.personaId === selId;
            return (
              <button
                key={p.personaId}
                type="button"
                onClick={() => elegir(p)}
                className={"flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 " + (activo ? "bg-primary/5" : "")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {iniciales(p.nombre)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {p.puestos.length === 0 ? "Sin puesto" : `${p.puestos.length} puesto${p.puestos.length === 1 ? "" : "s"}`}
                    {p.area ? ` · ${p.area}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel detalle: ficha de la persona */}
      <div>
        {!sel ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed border-border text-center">
            <div className="px-6">
              <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Elegí una persona de la lista para ver su perfil.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            {/* Cabecera */}
            <div className="mb-5 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {iniciales(sel.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium leading-tight">{sel.nombre}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sel.email ?? "sin email"}
                  {" · "}
                  {sel.tieneUsuario ? "con cuenta de usuario" : "sin cuenta de usuario"}
                  {sel.area ? ` · ${sel.area}` : ""}
                </p>
              </div>
              {sel.rolesGlobales.length > 0 && (
                <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  {sel.rolesGlobales.map((r) => (
                    <span key={r} className="rounded-md bg-[#EEEDFE] px-2 py-0.5 text-[11px] font-medium text-[#3C3489]">{r}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Puestos */}
            <div className="mb-5 border-t border-border pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Puestos que ocupa</p>
              {sel.puestos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta persona no ocupa ningún puesto, por lo que no tiene perfil RACI derivado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sel.puestos.map((pu) => (
                    <span key={pu} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {pu}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Perfil RACI */}
            {sel.puestos.length > 0 && (
              <>
                {pendiente && !perfil ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Calculando el perfil…
                  </div>
                ) : perfil ? (
                  <>
                    {/* Resumen del eje activo */}
                    <div className="mb-4 grid grid-cols-3 gap-2.5">
                      {(["A", "R", "I"] as const).map((k) => {
                        const n = (tab === "proceso" ? perfil.resumen.proceso : perfil.resumen.documento)[k];
                        return (
                          <div key={k} className="rounded-lg bg-muted/40 px-3 py-2.5">
                            <p className="text-[11px] text-muted-foreground">{RACI_META[k].label} ({k})</p>
                            <p className="mt-0.5 text-xl font-semibold" style={{ color: RACI_META[k].fg }}>{n}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pestañas */}
                    <div className="mb-3 inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
                      <button
                        type="button"
                        onClick={() => setTab("proceso")}
                        className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " + (tab === "proceso" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        aria-pressed={tab === "proceso"}
                      >
                        <Network className="h-4 w-4" />
                        Por proceso
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("documento")}
                        className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " + (tab === "documento" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        aria-pressed={tab === "documento"}
                      >
                        <FileText className="h-4 w-4" />
                        Por documento
                      </button>
                    </div>

                    <TablaPerfil filas={tab === "proceso" ? perfil.porProceso : perfil.porDocumento} vacio={tab === "proceso" ? "Esta persona no participa de ningún proceso." : "Esta persona no elabora ni aprueba documentos."} />
                  </>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TablaPerfil({ filas, vacio }: { filas: FilaRaci[]; vacio: string }) {
  if (filas.length === 0) {
    return <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{vacio}</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {filas.map((f, i) => {
            const m = RACI_META[f.raci];
            return (
              <tr key={f.codigo} className={i < filas.length - 1 ? "border-b border-border" : ""}>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground" style={{ width: 96, whiteSpace: "nowrap" }}>{f.codigo}</td>
                <td className="px-3 py-2">{f.etiqueta}</td>
                <td className="px-3 py-2 text-right" style={{ width: 56 }}>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-medium" style={{ backgroundColor: m.bg, color: m.fg }} title={m.label}>
                    {f.raci}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
