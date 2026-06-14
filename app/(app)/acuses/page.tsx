import Link from "next/link";
import { CheckCircle2, Users } from "lucide-react";
import { obtenerUsuarioActualId, obtenerBandejaAcuses } from "@/lib/api/acuses";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { AcuseCard } from "@/components/acuses/AcuseCard";

export const dynamic = "force-dynamic";

export default async function AcusesPage() {
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

  const { pendientes, completados } = await obtenerBandejaAcuses(usuarioId);
  const perfil = await obtenerPerfilMenu();

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Bandeja de acuses
          </p>
          <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">
            Acuses de lectura
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Documentos aprobados que requieren tu acuse de lectura. Al firmar dejás
            constancia formal e inmutable de que tomaste conocimiento del contenido.
          </p>
        </div>

        {perfil.esGestor && (
          <Link
            href="/acuses-pendientes"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Pendientes por usuario
          </Link>
        )}
      </header>

      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Pendientes de firma
          {pendientes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {pendientes.length}
            </span>
          )}
        </h2>

        {pendientes.length > 0 ? (
          <div className="space-y-3">
            {pendientes.map((a) => (
              <AcuseCard key={a.acuseId} acuse={a} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-medium text-foreground">No tenés acuses pendientes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando un documento aprobado requiera tu lectura, va a aparecer acá.
            </p>
          </div>
        )}
      </section>

      {completados.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Ya firmados
          </h2>
          <div className="space-y-3">
            {completados.map((a) => (
              <AcuseCard key={a.acuseId} acuse={a} completado />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
