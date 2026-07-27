import { Route, ShieldAlert } from "lucide-react";
import type { PasoTrazabilidad } from "@/lib/api/trazabilidad";
import { formatearFechaLarga } from "@/lib/fechas";

/**
 * Bloque de trazabilidad del ciclo: quién abrió, quién verificó la eficacia,
 * quién cerró, y quién completó o canceló cada acción.
 *
 * Decisiones de diseño (validadas antes de implementar):
 * - Las acciones van resumidas al pie, no como pasos del recorrido, para que
 *   una NC con muchas acciones siga siendo legible.
 * - Los actos sin actor registrado (anteriores a la migración 044) muestran
 *   "No registrado" en gris: el hueco declarado es mejor evidencia que el
 *   hueco disimulado.
 * - El cierre forzado por el SGI (sin verificación de eficacia) lleva un aviso
 *   ámbar visible, porque es lo primero que va a buscar un auditor.
 */

const ETAPA_LABEL: Record<string, string> = {
  apertura: "Abrió",
  deteccion: "Detectó",
  reapertura: "Reabrió",
  verificacion: "Verificó eficacia",
  cierre: "Cerró",
  aceptacion_riesgo: "Aceptó el riesgo",
};

const RESULTADO_LABEL: Record<string, string> = {
  eficaz: "Eficaz",
  parcialmente_eficaz: "Parcialmente eficaz",
  no_eficaz: "No eficaz",
};

const RESULTADO_CLASE: Record<string, string> = {
  eficaz: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  parcialmente_eficaz: "border-amber-400/40 bg-amber-400/10 text-amber-800",
  no_eficaz: "border-destructive/30 bg-destructive/10 text-destructive",
};

function iniciales(nombre: string | null): string {
  if (!nombre) return "—";
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Paso({ paso, zona }: { paso: PasoTrazabilidad; zona: string }) {
  const etiqueta = ETAPA_LABEL[paso.etapa] ?? paso.etapa;
  const sinActor = !paso.persona;
  const esForzado = paso.marca === "forzado";
  const resultado = paso.marca && RESULTADO_LABEL[paso.marca] ? paso.marca : null;

  return (
    <div className="flex gap-3 border-t border-border py-3 first:border-t-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
          sinActor ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        }`}
        aria-hidden="true"
      >
        {iniciales(paso.persona)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {etiqueta}
        </div>

        {sinActor ? (
          <div className="text-sm text-muted-foreground">
            No registrado
            <span className="ml-1.5 text-xs">
              (anterior al registro de actores)
            </span>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium">{paso.persona}</div>
            {paso.puesto && (
              <div className="text-sm text-muted-foreground">{paso.puesto}</div>
            )}
          </>
        )}

        {paso.marca === "externo" && (
          <div className="mt-1 text-xs text-muted-foreground">Parte externa</div>
        )}

        {resultado && (
          <span
            className={`mt-1.5 inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
              RESULTADO_CLASE[resultado] ?? ""
            }`}
          >
            {RESULTADO_LABEL[resultado]}
          </span>
        )}

        {esForzado && (
          <div className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Cierre forzado por el SGI, sin verificación de eficacia.</span>
          </div>
        )}

        {paso.detalle && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm italic leading-relaxed text-muted-foreground">
            «{paso.detalle}»
          </p>
        )}
      </div>

      <div className="shrink-0 text-sm text-muted-foreground">
        {paso.fecha ? formatearFechaLarga(paso.fecha, zona) : "—"}
      </div>
    </div>
  );
}

export function TrazabilidadCiclo({
  pasos,
  zona,
  titulo = "Trazabilidad del ciclo",
}: {
  pasos: PasoTrazabilidad[];
  zona: string;
  titulo?: string;
}) {
  if (pasos.length === 0) return null;

  const recorrido = pasos.filter(
    (p) => p.etapa !== "accion_completada" && p.etapa !== "accion_cancelada",
  );
  const acciones = pasos.filter(
    (p) => p.etapa === "accion_completada" || p.etapa === "accion_cancelada",
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Route className="h-3.5 w-3.5" aria-hidden="true" />
        {titulo}
      </h2>

      {recorrido.map((paso, i) => (
        <Paso key={`${paso.etapa}-${paso.fecha ?? i}`} paso={paso} zona={zona} />
      ))}

      {acciones.length > 0 && (
        <div className="mt-1 border-t border-border pt-3">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Acciones
          </div>
          {acciones.map((a, i) => (
            <div
              key={`acc-${a.fecha ?? i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{a.referencia ?? "—"}</span>
              <span className="shrink-0 text-muted-foreground">
                {a.etapa === "accion_cancelada" ? "Canceló" : "Completó"}{" "}
                {a.persona ?? "no registrado"}
                {a.fecha ? ` · ${formatearFechaLarga(a.fecha, zona)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
