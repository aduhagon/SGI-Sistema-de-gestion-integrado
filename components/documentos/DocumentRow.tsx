import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DocumentSummary } from "@/lib/api/documentos";
import { StatusDot } from "./StatusDot";

type Props = {
  documento: DocumentSummary;
};

/**
 * Fila del listado de documentos estilo gmail/notion.
 *
 * Estructura:
 *   [estado] [código]    [título · descripción]              [tipo · proceso · normas]  [fecha]
 *
 * Click en la fila navega al detalle. Hover state sutil.
 */
export function DocumentRow({ documento }: Props) {
  return (
    <Link
      href={`/documentos/${documento.id}`}
      className="group flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/40"
    >
      {/* Status indicator */}
      <StatusDot estado={documento.estado_actual} />

      {/* Código (monoespaciado) */}
      <div className="font-mono text-xs text-muted-foreground tabular-nums w-32 shrink-0 truncate">
        {documento.codigo}
      </div>

      {/* Título + descripción */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">
          {documento.titulo}
        </div>
        {documento.descripcion_corta && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {documento.descripcion_corta}
          </div>
        )}
      </div>

      {/* Metadata: tipo · proceso · normas */}
      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground shrink-0 max-w-md">
        {documento.tipo && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium tracking-tight"
            style={{
              backgroundColor: `${documento.tipo.color_hex ?? "#475569"}15`,
              color: documento.tipo.color_hex ?? "#475569",
            }}
          >
            {documento.tipo.codigo}
          </span>
        )}
        {documento.proceso && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate max-w-[150px]" title={documento.proceso.nombre}>
              {documento.proceso.codigo}
            </span>
          </>
        )}
        {documento.normas.length > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span
              className="truncate max-w-[120px]"
              title={documento.normas.map((n) => n.nombre_corto).join(", ")}
            >
              {documento.normas.length === 1
                ? documento.normas[0].codigo
                : `${documento.normas.length} normas`}
            </span>
          </>
        )}
      </div>

      {/* Fecha relativa */}
      <div className="hidden lg:block text-xs text-muted-foreground w-24 text-right shrink-0 tabular-nums">
        {formatearFechaRelativa(documento.actualizado_en ?? documento.creado_en)}
      </div>

      {/* Chevron de navegación */}
      <ChevronRight
        className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Formato de fecha relativa al estilo gmail: "hace 5 min", "hace 2h", "ayer", "12 mar"
 */
function formatearFechaRelativa(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDias === 1) return "ayer";
  if (diffDias < 7) return `hace ${diffDias}d`;

  // Para fechas más viejas, mostrar "12 mar" o "12 mar 2025" si es de otro año
  const esMismoAnio = fecha.getFullYear() === ahora.getFullYear();
  const opciones: Intl.DateTimeFormatOptions = esMismoAnio
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return fecha.toLocaleDateString("es-AR", opciones);
}
