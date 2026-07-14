import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import type { FirmaVersion } from "@/lib/api/firmas-version";

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FilaFirma({ firma }: { firma: FirmaVersion }) {
  const Icono = firma.aprobado ? CheckCircle2 : XCircle;
  const colorIcono = firma.aprobado ? "text-emerald-600" : "text-destructive";

  return (
    <div className="flex gap-3 p-4">
      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${colorIcono}`} aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {firma.rol}
          </span>
          {!firma.aprobado && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-destructive">
              Rechazado
            </span>
          )}
        </div>

        <p className="mt-0.5 font-medium leading-tight">{firma.persona}</p>

        {/* Puesto AL MOMENTO DE LA FIRMA. Si tenía más de uno, se listan todos. */}
        {firma.puestos.length > 0 ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {firma.puestos
              .map((p) => (p.area ? `${p.puesto} — ${p.area}` : p.puesto))
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-0.5 text-sm italic text-muted-foreground">
            Sin puesto registrado a esa fecha
          </p>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          {formatearFecha(firma.fecha)}
        </p>

        {firma.comentario && (
          <p className="mt-2 border-l-2 border-border pl-3 text-sm text-muted-foreground">
            {firma.comentario}
          </p>
        )}

        {/* Evidencia de firma: lo que un auditor pide para validar la trazabilidad. */}
        {firma.hashFirmado && (
          <details className="mt-2 group">
            <summary className="flex w-fit cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Evidencia de firma
            </summary>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">Hash firmado:</dt>
                <dd className="break-all font-mono">{firma.hashFirmado}</dd>
              </div>
              {firma.metodoAutenticacion && (
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium">Autenticación:</dt>
                  <dd>{firma.metodoAutenticacion}</dd>
                </div>
              )}
              {firma.ipOrigen && (
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium">IP de origen:</dt>
                  <dd className="font-mono">{firma.ipOrigen}</dd>
                </div>
              )}
            </dl>
          </details>
        )}
      </div>
    </div>
  );
}

export function CircuitoAprobacion({
  firmas,
  numeroVersion,
}: {
  firmas: FirmaVersion[];
  numeroVersion?: string;
}) {
  // Sin firmas registradas no se renderiza la sección.
  if (firmas.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Circuito de aprobación {numeroVersion && `· Versión ${numeroVersion}`}
      </h2>

      <div className="divide-y divide-border rounded-lg border border-border">
        {firmas.map((f) => (
          <FilaFirma key={f.id} firma={f} />
        ))}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        El puesto indicado corresponde al que ocupaba la persona en el momento de
        la firma.
      </p>
    </section>
  );
}
