import { GitBranch, FileText, Hash, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusDot } from "./StatusDot";
import type { VersionHistorial } from "@/lib/api/documentos";

type Props = {
  versiones: VersionHistorial[];
};

export function HistorialVersiones({ versiones }: Props) {
  if (versiones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground text-center">
          Este documento todavía no tiene versiones registradas.
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="space-y-4 relative">
      {versiones.map((v, idx) => (
        <li key={v.id} className="relative">
          {idx < versiones.length - 1 && (
            <span
              className="absolute left-[15px] top-10 bottom-0 w-px bg-border -mb-4"
              aria-hidden="true"
            />
          )}

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                    v.es_vigente
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <GitBranch className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge
                      variant={v.es_vigente ? "default" : "outline"}
                      className="font-mono"
                    >
                      Versión {v.numero_version}
                    </Badge>
                    <StatusDot estado={v.estado} showLabel />
                    {v.es_vigente && (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/40 bg-emerald-50 text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                        Vigente
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatearFecha(v.creado_en)}
                    </span>
                  </div>

                  {v.motivo_cambio && (
                    <p className="text-sm text-foreground/90 leading-relaxed mb-3">
                      {v.motivo_cambio}
                    </p>
                  )}

                  {v.archivo ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="font-medium text-foreground/70 truncate flex-1">
                        {v.archivo.nombre_original}
                      </span>
                      <span>{formatearTamano(v.archivo["tamaño_bytes"])}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="uppercase">{v.archivo.extension}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span
                        className="font-mono flex items-center gap-1"
                        title={`SHA256: ${v.archivo.hash_sha256}`}
                      >
                        <Hash className="h-3 w-3" aria-hidden="true" />
                        {v.archivo.hash_sha256.slice(0, 8)}…
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pt-3 border-t border-border">
                      Versión sin archivo cargado.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}

function formatearFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
