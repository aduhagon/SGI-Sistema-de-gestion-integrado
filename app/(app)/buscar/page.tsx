import Link from "next/link";
import { Search, FileText, BookOpen, Network, ClipboardCheck, AlertOctagon } from "lucide-react";
import { buscarGlobal, type ResultadoBusqueda } from "@/lib/api/busqueda";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

const GRUPOS = [
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "requisitos", label: "Requisitos", icon: BookOpen },
  { key: "procesos", label: "Procesos", icon: Network },
  { key: "auditorias", label: "Auditorías", icon: ClipboardCheck },
  { key: "noConformidades", label: "No conformidades", icon: AlertOctagon },
] as const;

export default async function BuscarPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();
  const resultados = q.length >= 2 ? await buscarGlobal(q) : null;

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Búsqueda</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          {q ? <>Resultados para “{q}”</> : "Buscar en el SGI"}
        </h1>
        {resultados && (
          <p className="mt-3 text-base text-muted-foreground">
            {resultados.total === 0
              ? "No se encontraron coincidencias."
              : `${resultados.total} ${resultados.total === 1 ? "resultado" : "resultados"} en documentos, requisitos, procesos, auditorías y no conformidades.`}
          </p>
        )}
      </header>

      {!q && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Search className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">Escribí algo en la barra de arriba</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Buscá por código (A-MP-05, 8.4, AUD-2026) o por texto en documentos,
            requisitos, procesos, auditorías y no conformidades.
          </p>
        </div>
      )}

      {q && q.length < 2 && (
        <p className="text-sm text-muted-foreground">Escribí al menos dos caracteres para buscar.</p>
      )}

      {resultados && resultados.total > 0 && (
        <div className="space-y-8">
          {GRUPOS.map(({ key, label, icon: Icon }) => {
            const items = resultados[key] as ResultadoBusqueda[];
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((r) => (
                    <Link
                      key={`${key}-${r.id}`}
                      href={r.href}
                      className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
                    >
                      {r.codigo && (
                        <Badge variant="outline" className="font-mono shrink-0">{r.codigo}</Badge>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.titulo}</div>
                        {r.subtitulo && (
                          <div className="truncate text-xs text-muted-foreground capitalize">{r.subtitulo}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
