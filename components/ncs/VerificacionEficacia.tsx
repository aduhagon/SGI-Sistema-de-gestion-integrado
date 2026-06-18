"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Plus, Paperclip, X, Download } from "lucide-react";
import type { Accion, VerificacionEficacia } from "@/lib/api/acciones";
import { registrarVerificacion, type EstadoAccion } from "@/app/(app)/ncs/[id]/accion-actions";
import { Button } from "@/components/ui/button";

type Props = {
  ncId: string;
  verificaciones: VerificacionEficacia[];
  acciones: Accion[];
};

const RESULTADO_META: Record<string, { label: string; color: string }> = {
  eficaz: { label: "Eficaz", color: "#059669" },
  parcialmente_eficaz: { label: "Parcialmente eficaz", color: "#d97706" },
  no_eficaz: { label: "No eficaz", color: "#dc2626" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando…</> : <><ShieldCheck className="h-4 w-4" />Registrar verificación</>}
    </Button>
  );
}

export function VerificacionEficaciaSection({ ncId, verificaciones, acciones }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useFormState<EstadoAccion, FormData>(registrarVerificacion, null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      setAbierto(false);
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }, [estado, router]);

  const accionesCompletadas = acciones.filter((a) => a.estado === "completada");

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />Verificación de eficacia
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          <Plus className="h-3.5 w-3.5" />Verificar
        </Button>
      </div>

      {verificaciones.length > 0 ? (
        <div className="space-y-2">
          {verificaciones.map((v) => {
            const meta = RESULTADO_META[v.resultado] ?? RESULTADO_META.no_eficaz;
            return (
              <div key={v.id} className="rounded-md border border-border bg-card p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.fechaVerificacion).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{v.conclusion}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Verificado por {v.verificadorNombre}</span>
                  {v.evidenciaArchivoId && (
                    <a
                      href={`/api/archivos/${v.evidenciaArchivoId}/descargar`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      {v.evidenciaNombre ?? "Evidencia"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Sin verificaciones de eficacia. Una vez ejecutadas las acciones, verificá si
          eliminaron la causa de la no conformidad.
        </p>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Verificar eficacia</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comprobá si las acciones eliminaron la causa raíz. No podés verificar acciones de las que sos responsable.
              </p>
              <form action={formAction} className="mt-6 space-y-5">
                <input type="hidden" name="noConformidadId" value={ncId} />

                <div className="space-y-2">
                  <label htmlFor="resultado" className="text-sm font-medium">Resultado</label>
                  <select id="resultado" name="resultado" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Elegí…</option>
                    <option value="eficaz">Eficaz</option>
                    <option value="parcialmente_eficaz">Parcialmente eficaz</option>
                    <option value="no_eficaz">No eficaz</option>
                  </select>
                </div>

                {accionesCompletadas.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Acciones verificadas</label>
                    <div className="space-y-1.5">
                      {accionesCompletadas.map((a) => (
                        <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <input type="checkbox" name="accionesVerificadas" value={a.id} className="h-4 w-4" />
                          <span><span className="font-mono text-xs">{a.codigo}</span> · {a.titulo}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Marcá las acciones que estás verificando. La base impide que verifiques las tuyas.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="conclusion" className="text-sm font-medium">Conclusión</label>
                  <textarea id="conclusion" name="conclusion" rows={4} required placeholder="Qué se verificó y por qué se concluye este resultado…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="evidenciaRevisada" className="text-sm font-medium">Evidencia revisada <span className="text-muted-foreground">(opcional)</span></label>
                  <textarea id="evidenciaRevisada" name="evidenciaRevisada" rows={2} placeholder="Descripción de la evidencia revisada." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Archivo de evidencia <span className="text-muted-foreground">(opcional, máx. 20 MB)</span></label>
                  {archivo ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{archivo.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(archivo.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </span>
                      <button type="button" onClick={() => { setArchivo(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Quitar archivo">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="evidenciaArchivo" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30">
                      <Paperclip className="h-3.5 w-3.5" />
                      Adjuntar archivo (PDF, imagen, etc.)
                    </label>
                  )}
                  <input
                    ref={fileRef}
                    id="evidenciaArchivo"
                    name="evidenciaArchivo"
                    type="file"
                    className="hidden"
                    onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  />
                </div>

                {estado && !estado.ok && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                  <SubmitButton />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
