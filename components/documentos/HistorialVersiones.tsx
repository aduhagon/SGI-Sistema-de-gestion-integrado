import { History, CheckCircle2, FileText } from "lucide-react";
import { VisorDocumento } from "@/components/documentos/VisorDocumento";
import type { VersionHistorial } from "@/lib/api/historialVersiones";

/**
 * Historial de versiones de un documento. Pensado SOLO para administradores
 * (la página decide si renderizarlo según el rol). El usuario común no lo ve;
 * trabaja únicamente con la versión vigente.
 *
 * Cada versión muestra su número, estado y motivo, y permite abrirla en el
 * visor (si tiene archivo visualizable).
 */

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  confeccionado: "Confeccionado",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  obsoleto: "Obsoleto",
};

function claseEstado(estado: string, esVigente: boolean): string {
  if (esVigente) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  switch (estado) {
    case "rechazado":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "obsoleto":
      return "bg-muted text-muted-foreground border-border";
    case "aprobado":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "pendiente_aprobacion":
    case "confeccionado":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function esVisualizable(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function HistorialVersiones({
  versiones,
}: {
  versiones: VersionHistorial[];
}) {
  if (versiones.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          Historial de versiones
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Solo administradores
        </span>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Todas las versiones de este documento. Los usuarios del sistema trabajan
        siempre con la versión vigente; este historial es para gestión y
        auditoría.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Versión</th>
              <th className="px-4 py-2.5 text-left font-medium">Estado</th>
              <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
              <th className="px-4 py-2.5 text-left font-medium">Motivo del cambio</th>
              <th className="px-4 py-2.5 text-right font-medium">Archivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {versiones.map((v) => (
              <tr key={v.id} className={v.esVigente ? "bg-emerald-500/[0.03]" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">v{v.numeroVersion}</span>
                    {v.esVigente && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                        title="Versión vigente"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Vigente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium " +
                      claseEstado(v.estado, v.esVigente)
                    }
                  >
                    {ESTADO_LABEL[v.estado] ?? v.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(v.creadaEn).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-2">{v.motivoCambio ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {v.archivo ? (
                    esVisualizable(v.archivo.mimeType) ? (
                      <VisorDocumento
                        archivoId={v.archivo.id}
                        mimeType={v.archivo.mimeType}
                        nombreOriginal={v.archivo.nombreOriginal}
                      />
                    ) : (
                      <a
                        href={`/api/archivos/${v.archivo.id}/descargar`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50"
                        title={`Descargar ${v.archivo.nombreOriginal}`}
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Descargar
                      </a>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin archivo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
