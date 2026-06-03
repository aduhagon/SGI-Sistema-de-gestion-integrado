import { CheckCircle2, Inbox } from "lucide-react";
import { obtenerUsuarioActualId, obtenerBandejaAprobaciones } from "@/lib/api/aprobaciones";
import { AprobacionCard } from "@/components/aprobaciones/AprobacionCard";

export const dynamic = "force-dynamic";

export default async function AprobacionesPage() {
  const usuarioId = await obtenerUsuarioActualId();

  if (!usuarioId) {
    return (
      <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
        <p className="text-sm text-muted-foreground">
          No pudimos identificar tu usuario en el sistema. Volvé a ingresar.
        </p>
      </div>
    );
  }

  const { paraDecidir, enEsperaN1 } = await obtenerBandejaAprobaciones(usuarioId);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Bandeja de aprobaciones
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          Aprobaciones pendientes
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Documentos que esperan tu decisión como aprobador de nivel 1 o nivel 2. Cada
          decisión queda registrada de forma permanente para auditoría.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Esperan tu decisión
          {paraDecidir.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {paraDecidir.length}
            </span>
          )}
        </h2>

        {paraDecidir.length > 0 ? (
          <div className="space-y-3">
            {paraDecidir.map((a) => (
              <AprobacionCard key={a.aprobacionId} aprobacion={a} accionable />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-medium text-foreground">No tenés aprobaciones pendientes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando un documento requiera tu aprobación, va a aparecer acá.
            </p>
          </div>
        )}
      </section>

      {enEsperaN1.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            En espera de nivel 1
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sos aprobador de nivel 2 de estos documentos. Vas a poder decidir una vez que
            el nivel 1 los apruebe.
          </p>
          <div className="space-y-3">
            {enEsperaN1.map((a) => (
              <AprobacionCard key={a.aprobacionId} aprobacion={a} accionable={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
